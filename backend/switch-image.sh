#!/bin/bash

# Script to switch between Alpine and Ubuntu base images

if [ "$1" == "alpine" ]; then
    echo "Switching to Alpine-based image..."
    sed -i 's/# compiler:/compiler:/g' docker-compose.yml
    sed -i 's/compiler-ubuntu:/#  compiler-ubuntu:/g' docker-compose.yml
    echo "Done! Run 'docker-compose down && docker-compose up -d --build' to apply changes."
elif [ "$1" == "ubuntu" ]; then
    echo "Switching to Ubuntu-based image..."
    sed -i 's/compiler:/#  compiler:/g' docker-compose.yml
    sed -i 's/#  compiler-ubuntu:/compiler-ubuntu:/g' docker-compose.yml
    echo "Done! Run 'docker-compose down && docker-compose up -d --build' to apply changes."
else
    echo "Usage: $0 <alpine|ubuntu>"
    echo "  alpine - Use the Alpine-based Docker image (smaller, may have compatibility issues)"
    echo "  ubuntu - Use the Ubuntu-based Docker image (larger, better compatibility)"
fi