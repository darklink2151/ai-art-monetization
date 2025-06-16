# model.py - Conceptual Stable Diffusion Model Integration

import os
from PIL import Image
import io
import random

class StableDiffusionModel:
    def __init__(self):
        # In a real application, this would load a Stable Diffusion model
        # from Hugging Face or interact with an Ollama instance.
        print("Initializing conceptual Stable Diffusion model...")
        self.available_styles = [
            "photorealistic", "fantasy", "sci-fi", "abstract", "cartoon",
            "impressionistic", "cyberpunk", "watercolor", "oil painting"
        ]

    def generate_image(self, prompt: str, style: str = "photorealistic", resolution: str = "512x512") -> Image.Image:
        """
        Simulates image generation based on a prompt, style, and resolution.
        In a real scenario, this would call the actual Stable Diffusion model.
        """
        print(f"Generating image for prompt: '{prompt}' with style: '{style}' and resolution: {resolution}")

        width, height = map(int, resolution.split("x"))

        # Simulate image generation based on prompt and style
        # For demonstration, we'll create a simple colored rectangle
        # and add some text to simulate content.
        
        # Choose a color based on style (conceptual)
        color_map = {
            "photorealistic": (100, 100, 100), # Grey
            "fantasy": (150, 50, 200),      # Purple
            "sci-fi": (50, 100, 150),       # Blue-grey
            "abstract": (200, 100, 50),     # Orange
            "cartoon": (255, 200, 0),       # Yellow
            "impressionistic": (180, 180, 100), # Muted Yellow
            "cyberpunk": (50, 200, 150),    # Teal
            "watercolor": (100, 150, 200),  # Light Blue
            "oil painting": (150, 100, 50)  # Brown
        }
        
        bg_color = color_map.get(style.lower(), (128, 128, 128)) # Default to grey

        img = Image.new("RGB", (width, height), color=bg_color)

        # Add some text to simulate the prompt being incorporated
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        
        try:
            # Try to load a default font, if not available, use a generic one
            font = ImageFont.truetype("arial.ttf", 20)
        except IOError:
            font = ImageFont.load_default()

        text_color = (255, 255, 255) if sum(bg_color) < 300 else (0, 0, 0) # White text on dark, black on light
        text_to_add = f"Prompt: {prompt}\nStyle: {style}\nResolution: {resolution}"
        
        # Calculate text size and position to center it
        bbox = draw.textbbox((0,0), text_to_add, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (width - text_width) / 2
        y = (height - text_height) / 2

        draw.text((x, y), text_to_add, fill=text_color, font=font)

        return img

    def get_available_styles(self) -> list[str]:
        return self.available_styles

    def get_available_resolutions(self) -> list[str]:
        return ["256x256", "512x512", "768x768", "1024x1024"]

# Example Usage (for testing purposes)
if __name__ == "__main__":
    model = StableDiffusionModel()
    test_image = model.generate_image("A cat in space", "sci-fi", "512x512")
    test_image.save("test_generated_image.png")
    print("Test image saved as test_generated_image.png")


