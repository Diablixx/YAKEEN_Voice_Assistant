#!/bin/bash

# Simple script to create placeholder icon files
# Uses ImageMagick (if available) or creates simple placeholder files

create_placeholder_icon() {
    local size=$1
    local filename=$2
    
    # Create a simple green circle with microphone symbol using ImageMagick if available
    if command -v convert >/dev/null 2>&1; then
        convert -size ${size}x${size} xc:none \
                -fill "#00ff88" \
                -draw "circle $((size/2)),$((size/2)) $((size/2)),$((size/4))" \
                -fill white \
                -pointsize $((size/4)) \
                -gravity center \
                -annotate +0+0 "🎙" \
                "$filename"
        echo "Created $filename using ImageMagick"
    else
        # Create a minimal PNG placeholder
        echo "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLwcZCG0uxsLGwsLGwsLGwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLGwsLCwsLCwsLGwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLGwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLGwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLGwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLGwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLGwsA==" | base64 -d > "$filename"
        echo "Created basic placeholder $filename"
    fi
}

# Create all required icon sizes
create_placeholder_icon 16 "favicon-16x16.png"
create_placeholder_icon 32 "favicon-32x32.png" 
create_placeholder_icon 180 "apple-touch-icon.png"
create_placeholder_icon 192 "icon-192.png"
create_placeholder_icon 512 "icon-512.png"

echo "All icons created!"
