# Native muscle surfaces and 4K stage

The previous attached muscles were generated ellipsoids and tubes, independently stretched to marker boxes. The new ten groups use 32 BodyParts3D surfaces from the same coordinate space as the skeleton. Their native dimensions, surface normals and attachment extents are preserved. Thin longitudinal surface detail and a rough red material replace the glossy pink treatment.

Groups: deltoid, forearm flexors/brachioradialis, tibialis anterior, thigh adductors, gluteals, triceps, biceps, quadriceps, hamstrings and calves. Selected multi-part groups remain one playable piece. Game names preserve the user's requested screen-side labeling; the atlas's anatomical left/right names are retained in mesh metadata.

## Provenance and reproduction

Source: https://github.com/ashemag/human-atlas/tree/1c38bf35c254a891200d3cedecfd57abebe83d8d/public/models

Download `atlas.json` to `/private/tmp/human-atlas.json` and `body-1.bin.gz`, `body-3.bin.gz`, `body-4.bin.gz` to `/private/tmp/muscles-body-1.bin.gz`, `/private/tmp/muscles-body-3.bin.gz`, `/private/tmp/muscles-body-4.bin.gz`. Then run `python3 scripts/import-muscles.py`. The generated files are checked in, so normal builds do not need these downloads. Attribution and changes are recorded in `licenses/bodyparts3d-muscles.md` and `/credits.html`.

Start the Vite server on port 5180 and run `node scripts/render-native-muscles.mjs` to render transparent tray images using the same material and mesh data as the game.

## Verification

At 3840×2160 the body frame has 160px clearance at both ends, labels are 24px, and controls and magnetic snap distances scale to twice their 1920px dimensions. The stage has no horizontal overflow. The completion camera preserves the gameplay scale.

All ten muscles were placed and visually reviewed from the front, rear, both profiles and an oblique angle. Front/rear snapshots document the fit over the bones. Browser coverage includes 4K completion, 1080p layout, all 25 placements, rotation, scoring, mouse-release snapping, touch, mobile, reduced motion, audio and fullscreen behavior.
