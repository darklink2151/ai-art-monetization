# Enhanced AI Art Generator Model with Real Integration Capabilities

import os
import requests
import json
from PIL import Image, ImageDraw, ImageFont
import io
import base64
from typing import Optional, Dict, Any

class StableDiffusionModel:
    """
    Enhanced AI Art Generator Model that can integrate with:
    1. Ollama (local model serving)
    2. Hugging Face Inference API
    3. Local Stable Diffusion models
    """
    
    def __init__(self, backend='mock', **kwargs):
        """
        Initialize the model with specified backend
        
        Args:
            backend: 'mock', 'ollama', 'huggingface', or 'local'
            **kwargs: Backend-specific configuration
        """
        self.backend = backend
        self.config = kwargs
        
        # Available styles and resolutions
        self.available_styles = [
            "photorealistic", "fantasy", "sci-fi", "abstract", "cartoon",
            "impressionistic", "cyberpunk", "watercolor", "oil painting",
            "anime", "digital art", "concept art", "portrait", "landscape"
        ]
        
        self.available_resolutions = [
            "256x256", "512x512", "768x768", "1024x1024", "1536x1536", "2048x2048"
        ]
        
        # Initialize backend
        self._initialize_backend()
    
    def _initialize_backend(self):
        """Initialize the specified backend"""
        if self.backend == 'ollama':
            self._init_ollama()
        elif self.backend == 'huggingface':
            self._init_huggingface()
        elif self.backend == 'local':
            self._init_local()
        else:
            print("Using mock backend for demonstration")
    
    def _init_ollama(self):
        """Initialize Ollama backend"""
        self.ollama_url = self.config.get('ollama_url', 'http://localhost:11434')
        self.model_name = self.config.get('model_name', 'llava')  # or another vision model
        print(f"Initialized Ollama backend: {self.ollama_url}")
    
    def _init_huggingface(self):
        """Initialize Hugging Face backend"""
        self.hf_token = self.config.get('hf_token')
        self.model_id = self.config.get('model_id', 'runwayml/stable-diffusion-v1-5')
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_id}"
        print(f"Initialized Hugging Face backend: {self.model_id}")
    
    def _init_local(self):
        """Initialize local Stable Diffusion backend"""
        try:
            from diffusers import StableDiffusionPipeline
            import torch
            
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            model_id = self.config.get('model_id', 'runwayml/stable-diffusion-v1-5')
            
            self.pipe = StableDiffusionPipeline.from_pretrained(
                model_id,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
            )
            self.pipe = self.pipe.to(self.device)
            print(f"Initialized local Stable Diffusion on {self.device}")
            
        except ImportError:
            print("Warning: diffusers not installed. Install with: pip install diffusers torch")
            self.backend = 'mock'
    
    def generate_image(self, prompt: str, style: str = "photorealistic", 
                      resolution: str = "512x512", **kwargs) -> Image.Image:
        """
        Generate an image based on the prompt, style, and resolution
        
        Args:
            prompt: Text description of the desired image
            style: Art style to apply
            resolution: Output image resolution
            **kwargs: Additional generation parameters
        
        Returns:
            PIL Image object
        """
        # Enhance prompt with style
        enhanced_prompt = self._enhance_prompt(prompt, style)
        
        if self.backend == 'ollama':
            return self._generate_ollama(enhanced_prompt, resolution, **kwargs)
        elif self.backend == 'huggingface':
            return self._generate_huggingface(enhanced_prompt, resolution, **kwargs)
        elif self.backend == 'local':
            return self._generate_local(enhanced_prompt, resolution, **kwargs)
        else:
            return self._generate_mock(enhanced_prompt, resolution, style)
    
    def _enhance_prompt(self, prompt: str, style: str) -> str:
        """Enhance the prompt with style-specific keywords"""
        style_enhancements = {
            "photorealistic": "photorealistic, highly detailed, professional photography",
            "fantasy": "fantasy art, magical, ethereal, mystical",
            "sci-fi": "science fiction, futuristic, cyberpunk, high-tech",
            "abstract": "abstract art, geometric, non-representational",
            "cartoon": "cartoon style, animated, colorful, stylized",
            "impressionistic": "impressionist painting, soft brushstrokes, atmospheric",
            "cyberpunk": "cyberpunk, neon lights, dark atmosphere, futuristic city",
            "watercolor": "watercolor painting, soft colors, flowing",
            "oil painting": "oil painting, classical art, rich textures",
            "anime": "anime style, manga, Japanese animation",
            "digital art": "digital art, concept art, detailed illustration",
            "concept art": "concept art, game art, detailed design",
            "portrait": "portrait, face focus, detailed features",
            "landscape": "landscape, scenic view, natural environment"
        }
        
        enhancement = style_enhancements.get(style.lower(), "")
        return f"{prompt}, {enhancement}" if enhancement else prompt
    
    def _generate_ollama(self, prompt: str, resolution: str, **kwargs) -> Image.Image:
        """Generate image using Ollama backend"""
        try:
            # Note: Ollama primarily serves text models, but this shows the integration pattern
            # For actual image generation, you'd need a model that supports it
            
            payload = {
                "model": self.model_name,
                "prompt": f"Generate an image description for: {prompt}",
                "stream": False
            }
            
            response = requests.post(f"{self.ollama_url}/api/generate", json=payload)
            
            if response.status_code == 200:
                # This is a simplified example - in practice, you'd need an image generation model
                # For now, fall back to mock generation with the enhanced description
                result = response.json()
                description = result.get('response', prompt)
                return self._generate_mock(description, resolution, "digital art")
            else:
                print(f"Ollama request failed: {response.status_code}")
                return self._generate_mock(prompt, resolution, "digital art")
                
        except Exception as e:
            print(f"Ollama generation error: {e}")
            return self._generate_mock(prompt, resolution, "digital art")
    
    def _generate_huggingface(self, prompt: str, resolution: str, **kwargs) -> Image.Image:
        """Generate image using Hugging Face Inference API"""
        try:
            headers = {}
            if self.hf_token:
                headers["Authorization"] = f"Bearer {self.hf_token}"
            
            # Parse resolution
            width, height = map(int, resolution.split('x'))
            
            payload = {
                "inputs": prompt,
                "parameters": {
                    "width": width,
                    "height": height,
                    "num_inference_steps": kwargs.get('steps', 20),
                    "guidance_scale": kwargs.get('guidance_scale', 7.5)
                }
            }
            
            response = requests.post(self.api_url, headers=headers, json=payload)
            
            if response.status_code == 200:
                image_bytes = response.content
                image = Image.open(io.BytesIO(image_bytes))
                return image
            else:
                print(f"Hugging Face API error: {response.status_code} - {response.text}")
                return self._generate_mock(prompt, resolution, "digital art")
                
        except Exception as e:
            print(f"Hugging Face generation error: {e}")
            return self._generate_mock(prompt, resolution, "digital art")
    
    def _generate_local(self, prompt: str, resolution: str, **kwargs) -> Image.Image:
        """Generate image using local Stable Diffusion model"""
        try:
            width, height = map(int, resolution.split('x'))
            
            # Generate image
            image = self.pipe(
                prompt,
                width=width,
                height=height,
                num_inference_steps=kwargs.get('steps', 20),
                guidance_scale=kwargs.get('guidance_scale', 7.5)
            ).images[0]
            
            return image
            
        except Exception as e:
            print(f"Local generation error: {e}")
            return self._generate_mock(prompt, resolution, "digital art")
    
    def _generate_mock(self, prompt: str, resolution: str, style: str) -> Image.Image:
        """Generate a mock image for demonstration purposes"""
        width, height = map(int, resolution.split('x'))
        
        # Create gradient background based on style
        style_colors = {
            "photorealistic": [(100, 100, 100), (150, 150, 150)],
            "fantasy": [(150, 50, 200), (200, 100, 255)],
            "sci-fi": [(50, 100, 150), (100, 150, 200)],
            "abstract": [(200, 100, 50), (255, 150, 100)],
            "cartoon": [(255, 200, 0), (255, 255, 100)],
            "impressionistic": [(180, 180, 100), (220, 220, 150)],
            "cyberpunk": [(50, 200, 150), (100, 255, 200)],
            "watercolor": [(100, 150, 200), (150, 200, 255)],
            "oil painting": [(150, 100, 50), (200, 150, 100)],
            "anime": [(255, 150, 200), (255, 200, 255)],
            "digital art": [(100, 150, 255), (150, 200, 255)],
            "concept art": [(80, 80, 120), (120, 120, 160)],
            "portrait": [(200, 180, 160), (255, 220, 200)],
            "landscape": [(100, 150, 100), (150, 200, 150)]
        }
        
        colors = style_colors.get(style.lower(), [(128, 128, 128), (180, 180, 180)])
        
        # Create gradient
        img = Image.new("RGB", (width, height))
        draw = ImageDraw.Draw(img)
        
        for y in range(height):
            ratio = y / height
            r = int(colors[0][0] * (1 - ratio) + colors[1][0] * ratio)
            g = int(colors[0][1] * (1 - ratio) + colors[1][1] * ratio)
            b = int(colors[0][2] * (1 - ratio) + colors[1][2] * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
        
        # Add text overlay
        try:
            font_size = max(12, min(width, height) // 20)
            font = ImageFont.truetype("arial.ttf", font_size)
        except (IOError, OSError):
            font = ImageFont.load_default()
        
        # Determine text color based on background
        avg_color = sum(colors[0]) // 3
        text_color = (255, 255, 255) if avg_color < 128 else (0, 0, 0)
        
        # Wrap text
        lines = self._wrap_text(prompt, font, width - 40)
        
        # Calculate total text height
        line_height = font.getbbox("A")[3] - font.getbbox("A")[1] + 5
        total_height = len(lines) * line_height
        
        # Center text vertically
        start_y = (height - total_height) // 2
        
        for i, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=font)
            text_width = bbox[2] - bbox[0]
            x = (width - text_width) // 2
            y = start_y + i * line_height
            
            # Add text shadow for better readability
            draw.text((x + 1, y + 1), line, fill=(0, 0, 0, 128), font=font)
            draw.text((x, y), line, fill=text_color, font=font)
        
        # Add style indicator
        style_text = f"Style: {style.title()}"
        style_bbox = draw.textbbox((0, 0), style_text, font=font)
        style_width = style_bbox[2] - style_bbox[0]
        draw.text((width - style_width - 10, 10), style_text, fill=text_color, font=font)
        
        return img
    
    def _wrap_text(self, text: str, font, max_width: int) -> list:
        """Wrap text to fit within specified width"""
        words = text.split()
        lines = []
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            bbox = font.getbbox(test_line)
            width = bbox[2] - bbox[0]
            
            if width <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                    current_line = [word]
                else:
                    lines.append(word)  # Word is too long, add it anyway
        
        if current_line:
            lines.append(' '.join(current_line))
        
        return lines
    
    def get_available_styles(self) -> list:
        """Return list of available art styles"""
        return self.available_styles
    
    def get_available_resolutions(self) -> list:
        """Return list of available resolutions"""
        return self.available_resolutions
    
    def get_backend_info(self) -> Dict[str, Any]:
        """Return information about the current backend"""
        return {
            "backend": self.backend,
            "config": self.config,
            "styles": len(self.available_styles),
            "resolutions": len(self.available_resolutions)
        }

# Factory function for easy model creation
def create_model(backend='mock', **kwargs):
    """
    Factory function to create a model with specified backend
    
    Examples:
        # Mock backend (for testing)
        model = create_model('mock')
        
        # Ollama backend
        model = create_model('ollama', ollama_url='http://localhost:11434', model_name='llava')
        
        # Hugging Face backend
        model = create_model('huggingface', hf_token='your_token', model_id='runwayml/stable-diffusion-v1-5')
        
        # Local backend
        model = create_model('local', model_id='runwayml/stable-diffusion-v1-5')
    """
    return StableDiffusionModel(backend=backend, **kwargs)

# Example usage and testing
if __name__ == "__main__":
    # Test with mock backend
    print("Testing AI Art Generator Model...")
    
    model = create_model('mock')
    print(f"Backend info: {model.get_backend_info()}")
    
    # Generate test image
    test_image = model.generate_image(
        "A beautiful sunset over mountains", 
        "landscape", 
        "512x512"
    )
    
    test_image.save("test_generated_art.png")
    print("Test image saved as test_generated_art.png")
    
    # Example of how to use with real backends:
    
    # Uncomment to test with Ollama (requires Ollama running locally)
    # ollama_model = create_model('ollama', ollama_url='http://localhost:11434')
    
    # Uncomment to test with Hugging Face (requires API token)
    # hf_model = create_model('huggingface', hf_token='your_hf_token_here')
    
    # Uncomment to test with local model (requires diffusers installed)
    # local_model = create_model('local')

