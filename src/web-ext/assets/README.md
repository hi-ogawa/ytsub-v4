```sh
# youtube-fill.svg is downloaded from https://remixicon.com/icon/youtube-fill
image_dir="src/web-ext/assets"
for px in 16 32 48 128; do
  magick -density 1000 -background none "${image_dir}/youtube-fill.svg" "${image_dir}/icon-${px}.png"
done
```
