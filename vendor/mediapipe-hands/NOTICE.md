# MediaPipe Hands (self-hosted copy)

Files in this folder are the unmodified runtime of `@mediapipe/hands@0.4.1675469240`
(Google, Apache License 2.0, https://www.npmjs.com/package/@mediapipe/hands),
copied here so Spatial Mode / Brief Builder does not depend on a public CDN being reachable
from a corporate network. Hand tracking runs entirely in the browser; no video leaves the device.

Not included on purpose: `hand_landmark_lite.tflite` (Spatial Mode uses modelComplexity 1, the full model).
To upgrade: replace these files together from a newer package version and test on a laptop webcam.
