Product photos for the four seeded products.

The filenames below MUST match the image_url values in database/schema.sql
(and in the FALLBACK_PRODUCTS list in frontend/js/main.js), otherwise the
browser gets a 404 and the card shows a placeholder instead of the photo:

  zig-zag-block.jpg     -> Zig-Zag Block   (red/tan herringbone road)
  toras-interlock.jpg   -> Toras Interlock (red + yellow interlocking pair)
  grass-paver.jpg       -> Grass Paver     (perforated block laid on grass)
  chequered-tile.jpg    -> Chequered Tile  (four textured coloured tiles)

If you swap in your own photos, keep these exact filenames — or change all
three of: this folder's files, the schema.sql seed, and FALLBACK_PRODUCTS.

Why names matter: the old file referenced a local Windows path (C:\FAMILLY
PHOTO\...) which only exists on a personal PC and can never be reached by a
browser on the internet. Missing files now return a real 404 (not index.html)
and the frontend swaps in a gold/navy placeholder so nothing looks broken.
