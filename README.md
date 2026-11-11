# Portfolio

A cinematic, scroll-driven 3D portfolio: a journey from the soul to the mind, and from the mind to creation.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

Add `?debug` to the address to see scroll progress, the current scene and the frame rate.

## Where to edit things

| What | File |
| --- | --- |
| Name, role line, tagline, contact links | `src/content/site.ts` |
| The words shown in each scene | `src/content/story.ts` |
| Skills, projects, research, achievements | `src/content/graph.ts` |
| Scene lengths, camera keyframes, easings, durations | `src/motion/timeline.ts` |
| Colours, fonts, sizes | `src/styles/tokens.css` |

## How it is built

- `src/components/Experience.tsx` owns smooth scrolling (Lenis) and publishes scroll progress.
- `src/motion/director.ts` turns progress into the camera's goal and the colour of the light.
- `src/components/canvas/` holds the 3D world: the spring camera rig, dust, nebula and the guide light.
- `src/components/ui/` holds the loader, the story text and the interface.

Everything is free and open source: Next.js, Three.js, React Three Fiber, GSAP and Lenis. No paid services or assets are used.
