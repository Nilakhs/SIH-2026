import psutil
import platform
import subprocess
import asyncio
import re

async def get_gpu_info() -> dict | None:
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        if gpus:
            gpu = gpus[0]
            # Try to get CUDA and Driver version using nvidia-smi
            cuda_version = None
            driver_version = None
            try:
                output = subprocess.check_output(["nvidia-smi"], text=True)
                # Parse output for versions
                cuda_match = re.search(r'CUDA Version:\s*([0-9.]+)', output)
                driver_match = re.search(r'Driver Version:\s*([0-9.]+)', output)
                if cuda_match:
                    cuda_version = cuda_match.group(1)
                if driver_match:
                    driver_version = driver_match.group(1)
            except Exception:
                pass

            return {
                "name": gpu.name,
                "vram_total_mb": gpu.memoryTotal,
                "vram_used_mb": gpu.memoryUsed,
                "vram_free_mb": gpu.memoryFree,
                "gpu_utilization": round(gpu.load * 100, 2),
                "temperature": gpu.temperature,
                "cuda_version": cuda_version,
                "driver_version": driver_version
            }
    except Exception:
        pass
    
    # Fallback to nvidia-smi
    try:
        output = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu", "--format=csv,noheader,nounits"],
            text=True
        )
        if output.strip():
            parts = [p.strip() for p in output.split(',')]
            if len(parts) >= 6:
                cuda_version = None
                driver_version = None
                try:
                    smi_full = subprocess.check_output(["nvidia-smi"], text=True)
                    cuda_match = re.search(r'CUDA Version:\s*([0-9.]+)', smi_full)
                    driver_match = re.search(r'Driver Version:\s*([0-9.]+)', smi_full)
                    if cuda_match:
                        cuda_version = cuda_match.group(1)
                    if driver_match:
                        driver_version = driver_match.group(1)
                except Exception:
                    pass

                return {
                    "name": parts[0],
                    "vram_total_mb": float(parts[1]),
                    "vram_used_mb": float(parts[2]),
                    "vram_free_mb": float(parts[3]),
                    "gpu_utilization": float(parts[4]),
                    "temperature": float(parts[5]),
                    "cuda_version": cuda_version,
                    "driver_version": driver_version
                }
    except Exception:
        pass
    
    return None

async def get_cpu_info() -> dict:
    try:
        return {
            "name": platform.processor(),
            "physical_cores": psutil.cpu_count(logical=False),
            "logical_cores": psutil.cpu_count(logical=True),
            "usage_percent": psutil.cpu_percent(interval=1),
            "frequency_mhz": psutil.cpu_freq().current if psutil.cpu_freq() else None
        }
    except Exception:
        return {
            "name": platform.processor() or "Unknown CPU",
            "physical_cores": 0,
            "logical_cores": 0,
            "usage_percent": 0.0,
            "frequency_mhz": 0.0
        }

async def get_memory_info() -> dict:
    try:
        mem = psutil.virtual_memory()
        return {
            "total_gb": round(mem.total / (1024**3), 2),
            "available_gb": round(mem.available / (1024**3), 2),
            "used_gb": round(mem.used / (1024**3), 2),
            "usage_percent": mem.percent
        }
    except Exception:
        return {
            "total_gb": 0.0,
            "available_gb": 0.0,
            "used_gb": 0.0,
            "usage_percent": 0.0
        }

async def get_disk_info() -> dict:
    try:
        path = 'C:\\' if platform.system() == 'Windows' else '/'
        disk = psutil.disk_usage(path)
        return {
            "total_gb": round(disk.total / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "usage_percent": disk.percent
        }
    except Exception:
        return {
            "total_gb": 0.0,
            "free_gb": 0.0,
            "used_gb": 0.0,
            "usage_percent": 0.0
        }

async def get_os_info() -> dict:
    try:
        return {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine()
        }
    except Exception:
        return {
            "system": "Unknown",
            "release": "Unknown",
            "version": "Unknown",
            "machine": "Unknown"
        }

def get_model_recommendation(gpu_info: dict | None) -> dict:
    try:
        vram = 0
        if gpu_info and "vram_total_mb" in gpu_info:
            vram = gpu_info["vram_total_mb"] / 1024.0

        if not gpu_info or vram < 4:
            return {
                "tier": "cpu",
                "recommended_models": [
                    {"role": "chat", "model": "qwen2.5:3b-instruct-q4_K_M", "size": "3B", "target": "CPU"},
                    {"role": "embedding", "model": "nomic-embed-text", "size": "137M", "target": "CPU"}
                ]
            }
        elif 4 <= vram < 5.5:
            return {
                "tier": "low-vram",
                "recommended_models": [
                    {"role": "chat", "model": "qwen2.5:7b-instruct-q4_K_M", "size": "7B", "target": "GPU"},
                    {"role": "coder", "model": "qwen2.5-coder:7b-instruct-q4_K_M", "size": "7B", "target": "GPU"},
                    {"role": "embedding", "model": "nomic-embed-text", "size": "137M", "target": "GPU"},
                    {"role": "vision", "model": "moondream2", "size": "1.4B", "target": "GPU"}
                ]
            }
        elif 5.5 <= vram < 12:
            return {
                "tier": "mid-vram",
                "recommended_models": [
                    {"role": "chat", "model": "qwen2.5:7b-instruct-q4_K_M", "size": "7B", "target": "GPU"},
                    {"role": "coder", "model": "qwen2.5-coder:7b-instruct-q4_K_M", "size": "7B", "target": "GPU"},
                    {"role": "embedding", "model": "nomic-embed-text", "size": "137M", "target": "GPU"},
                    {"role": "vision", "model": "moondream2", "size": "1.4B", "target": "GPU"}
                ]
            }
        else:
            return {
                "tier": "high-vram",
                "recommended_models": [
                    {"role": "chat", "model": "qwen2.5:14b-instruct-q4_K_M", "size": "14B", "target": "GPU"},
                    {"role": "coder", "model": "qwen2.5-coder:14b-instruct-q4_K_M", "size": "14B", "target": "GPU"},
                    {"role": "embedding", "model": "nomic-embed-text", "size": "137M", "target": "GPU"},
                    {"role": "vision", "model": "moondream2", "size": "1.4B", "target": "GPU"}
                ]
            }
    except Exception:
        return {"tier": "cpu", "recommended_models": []}

async def get_full_system_info() -> dict:
    gpu_info = await get_gpu_info()
    cpu_info = await get_cpu_info()
    memory_info = await get_memory_info()
    disk_info = await get_disk_info()
    os_info = await get_os_info()
    model_rec = get_model_recommendation(gpu_info)

    return {
        "gpu": gpu_info,
        "cpu": cpu_info,
        "memory": memory_info,
        "disk": disk_info,
        "os": os_info,
        "model_recommendation": model_rec
    }
