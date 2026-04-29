# Gellow Physics Web

This is a small static demo for the new gellow.top direction.

## Shape

- `index.html` mounts the page.
- `js/physics-module.js` owns Matter.js setup, bodies, collisions, dragging, reset, and shake.
- `js/app.js` owns website behavior: opening floating child windows or external tabs.
- `pages/` contains small iframe pages used by the demo.

The important boundary is that the physics module only emits open events. It does not know what a blog page, notes page, or external site is.

## Run

Open `index.html` directly, or serve the folder with any static server.

For Vercel later, this folder can be deployed as a static site without a build step.
