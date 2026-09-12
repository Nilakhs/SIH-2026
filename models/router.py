from .provider import TaskType

class TaskRouter:
    """Deterministic task classifier based on keyword analysis."""
    
    # Define keyword sets for each task type
    CODING_KEYWORDS = {'code', 'python', 'script', 'calculate', 'compute', 'analyze data', 
                       'csv', 'excel', 'dataframe', 'plot', 'chart', 'graph', 'algorithm',
                       'function', 'program', 'debug', 'sql', 'query', 'statistics',
                       'average', 'sum', 'count', 'downtime', 'top 5', 'top five', 'top 10'}
    
    DOCUMENT_KEYWORDS = {'document', 'report', 'summarize', 'summary', 'extract', 'pdf',
                         'read', 'inspection', 'manual', 'policy', 'sop', 'procedure',
                         'review', 'analyze report', 'findings', 'compliance', 'audit'}
    
    VISION_KEYWORDS = {'image', 'picture', 'photo', 'diagram', 'p&id', 'pid',
                       'drawing', 'schematic', 'visual', 'ocr', 'scan', 'screenshot'}
    
    GENERATION_KEYWORDS = {'generate', 'create document', 'create report', 'approval note',
                           'write report', 'make presentation', 'create excel', 'make docx',
                           'pptx', 'powerpoint', 'word document', 'spreadsheet'}
    
    def classify(self, user_message: str, has_image: bool = False) -> tuple[TaskType, str]:
        """Returns (task_type, reason)"""
        if has_image:
            return TaskType.IMAGE_VISION, "Image input detected; routing to local vision model."

        msg_lower = user_message.lower()
        
        # Score each category
        scores = {
            TaskType.CODING_DATA_ANALYSIS: self._score(msg_lower, self.CODING_KEYWORDS),
            TaskType.DOCUMENT_ANALYSIS: self._score(msg_lower, self.DOCUMENT_KEYWORDS),
            TaskType.IMAGE_VISION: self._score(msg_lower, self.VISION_KEYWORDS),
            TaskType.DOCUMENT_GENERATION: self._score(msg_lower, self.GENERATION_KEYWORDS),
        }
        
        best_type = max(scores, key=scores.get)
        if scores[best_type] == 0:
            return TaskType.GENERAL_REASONING, "No specific task pattern detected, using general reasoning."
        
        reasons = {
            TaskType.CODING_DATA_ANALYSIS: "Request involves data analysis or code generation.",
            TaskType.DOCUMENT_ANALYSIS: "Request involves document reading or analysis.",
            TaskType.IMAGE_VISION: "Request involves image or diagram analysis.",
            TaskType.DOCUMENT_GENERATION: "Request involves generating a document or report.",
        }
        
        return best_type, reasons[best_type]
    
    def _score(self, text: str, keywords: set) -> int:
        return sum(1 for kw in keywords if kw in text)
    
    def get_model_for_task(self, task_type: TaskType, available_models: list[str]) -> str | None:
        """Select the best available model for the task type."""
        preferences = {
            TaskType.GENERAL_REASONING: ['qwen2.5:7b', 'qwen2.5:3b', 'llama3.2:3b', 'mistral'],
            TaskType.CODING_DATA_ANALYSIS: ['qwen2.5-coder:7b', 'qwen2.5-coder:3b', 'qwen2.5:7b', 'codellama'],
            TaskType.DOCUMENT_ANALYSIS: ['qwen2.5:7b', 'qwen2.5:3b', 'llama3.2:3b', 'mistral'],
            TaskType.IMAGE_VISION: ['moondream', 'moondream2', 'llama3.2-vision', 'llava-phi3', 'minicpm-v', 'llava', 'bakllava'],
            TaskType.DOCUMENT_GENERATION: ['qwen2.5:7b', 'qwen2.5:3b', 'llama3.2:3b', 'mistral'],
        }
        
        for preferred in preferences.get(task_type, []):
            for available in available_models:
                if preferred.lower() in available.lower():
                    return available
        
        if task_type == TaskType.IMAGE_VISION:
            # Check for any vision-capable model
            for available in available_models:
                if any(v in available.lower() for v in ['vision', 'vl', 'llava', 'moondream']):
                    return available
            return None

        # Fallback to first available model for text tasks
        return available_models[0] if available_models else None
