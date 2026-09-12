import os
import ast
import uuid
import shutil
import subprocess
from typing import Tuple, List, Dict, Any

def get_sandbox_status() -> Dict[str, Any]:
    try:
        res = subprocess.run(["docker", "--version"], capture_output=True, text=True, timeout=5)
        docker_available = res.returncode == 0
    except Exception:
        docker_available = False

    return {
        "docker_available": docker_available,
        "sandbox_ready": docker_available,
        "network_isolation": True
    }

def validate_code(code: str) -> Tuple[bool, str]:
    restricted_modules = {'os', 'subprocess', 'sys', 'socket', 'urllib', 'requests', 'ctypes', 'shutil'}
    restricted_functions = {'eval', 'exec', 'open'}
    
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"Syntax error in code: {e}"
        
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split('.')[0] in restricted_modules:
                    return False, f"Import of restricted module '{alias.name}' is not allowed."
        elif isinstance(node, ast.ImportFrom):
            if node.module and node.module.split('.')[0] in restricted_modules:
                return False, f"Import from restricted module '{node.module}' is not allowed."
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in restricted_functions:
                    return False, f"Call to restricted function '{node.func.id}' is not allowed."
    
    return True, "Code is valid."

def execute_in_sandbox(code: str, input_files: List[str] = None) -> Dict[str, Any]:
    status = get_sandbox_status()
    if not status.get("docker_available"):
        return {
            "status": "failed",
            "exit_code": 1,
            "stderr": "Docker is unavailable on this host. Sandbox execution aborted to prevent local host execution.",
            "stdout": "",
            "files": []
        }
        
    sandbox_dir = os.path.join(r"c:\SIH\backend\data\sandbox", str(uuid.uuid4()))
    os.makedirs(sandbox_dir, exist_ok=True)
    
    script_path = os.path.join(sandbox_dir, "script.py")
    try:
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(code)
            
        # Copy input files into sandbox
        candidate_dirs = [r"c:\SIH", r"c:\SIH\backend\data\uploads", os.getcwd()]
        
        # 1. Any explicitly passed input files
        if input_files:
            for fpath in input_files:
                target_name = os.path.basename(fpath)
                for cdir in candidate_dirs:
                    full_p = os.path.join(cdir, fpath)
                    if os.path.isfile(full_p):
                        shutil.copy(full_p, os.path.join(sandbox_dir, target_name))
                        break
                    full_p = os.path.join(cdir, target_name)
                    if os.path.isfile(full_p):
                        shutil.copy(full_p, os.path.join(sandbox_dir, target_name))
                        break
        
        # 2. Automatically copy all dataset files (.csv, .xlsx, .txt) from project root and uploads
        for cdir in [r"c:\SIH", r"c:\SIH\backend\data\uploads"]:
            if os.path.isdir(cdir):
                for fname in os.listdir(cdir):
                    if fname.endswith(('.csv', '.xlsx', '.txt')):
                        src = os.path.join(cdir, fname)
                        if os.path.isfile(src):
                            # Clean uuid prefix if present: e.g. <uuid>_test_equipment_downtime.csv -> test_equipment_downtime.csv
                            dest_name = fname
                            if "_" in fname and len(fname.split("_")[0]) == 36:
                                dest_name = "_".join(fname.split("_")[1:])
                            dest = os.path.join(sandbox_dir, dest_name)
                            if not os.path.exists(dest):
                                shutil.copy(src, dest)

        cmd = [
            "docker", "run", "--rm", "--network", "none", "--user", "1000:1000",
            "--memory", "512m", "--cpus", "1.0",
            "-v", f"{sandbox_dir}:/workspace",
            "-w", "/workspace",
            "sih-sandbox", "python", "script.py"
        ]
        
        start_time = time.time()
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            duration_ms = (time.time() - start_time) * 1000
            
            output_files = []
            for item in os.listdir(sandbox_dir):
                if item != "script.py":
                    output_files.append(item)
            
            try:
                from audit import log_audit_event
                log_audit_event(
                    event_type="DOCKER_SANDBOX",
                    task_type="coding_data_analysis",
                    model="docker/sih-sandbox",
                    tool_name="PYTHON_SANDBOX",
                    duration_ms=duration_ms,
                    exit_code=res.returncode,
                    status="COMPLETED" if res.returncode == 0 else "FAILED",
                    summary=f"Executed sandbox script (--network none, 512MB RAM). Exit code: {res.returncode}",
                    airgap_verified=True
                )
            except Exception:
                pass
                    
            return {
                "status": "success" if res.returncode == 0 else "failed",
                "exit_code": res.returncode,
                "stdout": res.stdout,
                "stderr": res.stderr,
                "files": output_files
            }
        except subprocess.TimeoutExpired as e:
            return {
                "status": "failed",
                "exit_code": 124,
                "stdout": e.stdout.decode('utf-8') if hasattr(e, 'stdout') and e.stdout else "",
                "stderr": "Execution timed out after 30 seconds.",
                "files": []
            }
        except Exception as e:
            return {
                "status": "failed",
                "exit_code": 1,
                "stdout": "",
                "stderr": f"Execution error: {str(e)}",
                "files": []
            }
    finally:
        try:
            shutil.rmtree(sandbox_dir, ignore_errors=True)
        except Exception:
            pass
