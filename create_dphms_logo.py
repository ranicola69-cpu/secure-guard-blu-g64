#!/usr/bin/env python3
"""
Create Doctor Power House (DPHMS) Logo
Medical + Power + Security themed
"""

from PIL import Image, ImageDraw, ImageFont
import math

def create_doctor_powerhouse_logo():
    """Create a professional Doctor Power House medical security logo"""
    size = 1024
    img = Image.new('RGBA', (size, size), (10, 10, 10, 255))
    draw = ImageDraw.Draw(img)
    center = size // 2
    
    # Draw outer glow
    for i in range(8, 0, -1):
        alpha = int(255 * (i / 8) * 0.2)
        offset = i * 12
        draw.ellipse([offset, offset, size-offset, size-offset], 
                     fill=(0, 255, 136, alpha))
    
    # Main circle background
    radius = int(size * 0.43)
    draw.ellipse([center-radius, center-radius, center+radius, center+radius], 
                 fill=(15, 15, 15, 255))
    
    # Medical Cross base (hospital/doctor symbol)
    cross_size = 200
    cross_thickness = 60
    cross_x = center - cross_thickness // 2
    cross_y = center - cross_size // 2
    
    # Vertical bar of cross
    draw.rectangle([cross_x, cross_y, cross_x + cross_thickness, cross_y + cross_size],
                   fill=(0, 255, 136, 255))
    
    # Horizontal bar of cross
    cross_h_x = center - cross_size // 2
    cross_h_y = center - cross_thickness // 2
    draw.rectangle([cross_h_x, cross_h_y, cross_h_x + cross_size, cross_h_y + cross_thickness],
                   fill=(0, 255, 136, 255))
    
    # Add power/energy circles in the four quadrants of the cross
    circle_radius = 25
    offset = 85
    
    # Top left
    draw.ellipse([center - offset - circle_radius, center - offset - circle_radius,
                  center - offset + circle_radius, center - offset + circle_radius],
                 fill=(0, 200, 110, 255))
    
    # Top right
    draw.ellipse([center + offset - circle_radius, center - offset - circle_radius,
                  center + offset + circle_radius, center - offset + circle_radius],
                 fill=(0, 200, 110, 255))
    
    # Bottom left
    draw.ellipse([center - offset - circle_radius, center + offset - circle_radius,
                  center - offset + circle_radius, center + offset + circle_radius],
                 fill=(0, 200, 110, 255))
    
    # Bottom right
    draw.ellipse([center + offset - circle_radius, center + offset - circle_radius,
                  center + offset + circle_radius, center + offset + circle_radius],
                 fill=(0, 200, 110, 255))
    
    # Add shield outline for security
    shield_width = int(size * 0.55)
    shield_height = int(size * 0.65)
    shield_top = int(size * 0.17)
    shield_left = center - shield_width // 2
    shield_right = center + shield_width // 2
    
    shield_points = [
        (center, shield_top),
        (shield_right, shield_top + 60),
        (shield_right, shield_top + shield_height - 120),
        (center, shield_top + shield_height),
        (shield_left, shield_top + shield_height - 120),
        (shield_left, shield_top + 60),
    ]
    
    # Draw shield border (no fill, just outline)
    for i in range(8):
        offset_shield = [(p[0], p[1]) for p in shield_points]
        draw.polygon(offset_shield, outline=(0, 255, 136, 100), width=3)
    
    # Add pulse/heartbeat line across the cross (medical + power)
    pulse_y = center
    pulse_points = [
        (center - 150, pulse_y),
        (center - 100, pulse_y),
        (center - 80, pulse_y - 30),
        (center - 60, pulse_y + 30),
        (center - 40, pulse_y),
        (center - 20, pulse_y),
        (center, pulse_y - 20),
        (center + 20, pulse_y + 20),
        (center + 40, pulse_y),
        (center + 60, pulse_y),
        (center + 80, pulse_y - 25),
        (center + 100, pulse_y + 25),
        (center + 120, pulse_y),
        (center + 150, pulse_y),
    ]
    draw.line(pulse_points, fill=(255, 255, 255, 200), width=4)
    
    # Add small "power bolt" in center of cross
    bolt_size = 30
    bolt_points = [
        (center + 10, center - bolt_size),
        (center - 5, center - 5),
        (center + 5, center - 5),
        (center - 10, center + bolt_size),
        (center + 5, center + 5),
        (center - 5, center + 5),
    ]
    draw.polygon(bolt_points, fill=(255, 255, 255, 255))
    
    # Add corner brackets (tech/security theme)
    bracket_size = 40
    bracket_thickness = 5
    bracket_offset = 120
    
    # Draw corner brackets
    draw.rectangle([center - bracket_offset, center - bracket_offset, 
                    center - bracket_offset + bracket_size, center - bracket_offset + bracket_thickness],
                   fill=(0, 255, 136, 180))
    draw.rectangle([center - bracket_offset, center - bracket_offset,
                    center - bracket_offset + bracket_thickness, center - bracket_offset + bracket_size],
                   fill=(0, 255, 136, 180))
    
    return img

# Create all icon sizes
print("🏥 Creating Doctor Power House (DPHMS) Logo...")

logo = create_doctor_powerhouse_logo()

# Save main icon
logo.save('/app/security-app/frontend/assets/images/icon.png')
print("✓ Created icon.png (1024x1024)")

# Adaptive icon
logo.save('/app/security-app/frontend/assets/images/adaptive-icon.png')
print("✓ Created adaptive-icon.png (1024x1024)")

# Favicon
favicon = logo.resize((192, 192), Image.Resampling.LANCZOS)
favicon.save('/app/security-app/frontend/assets/images/favicon.png')
print("✓ Created favicon.png (192x192)")

# Splash icon
splash = logo.resize((512, 512), Image.Resampling.LANCZOS)
splash.save('/app/security-app/frontend/assets/images/splash-icon.png')
print("✓ Created splash-icon.png (512x512)")

# App image (for Play Store)
app_image = logo.resize((512, 512), Image.Resampling.LANCZOS)
app_image.save('/app/security-app/frontend/assets/images/app-image.png')
print("✓ Created app-image.png (512x512)")

print("\n🎨 Doctor Power House logo created successfully!")
print("Theme: Medical Cross + Power + Security Shield")
