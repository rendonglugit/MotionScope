# Third-party software and example assets

MotionScope application source and original samples are MIT licensed. This does not relicense third-party runtimes or example assets. Retain their notices when redistributing the project or built site. Generated distributions include package license texts under `licenses/` and the inventory `licenses/index.json`.

## Runtime dependencies

| Software | Version | Declared license / source |
| --- | --- | --- |
| lottie-web | 5.13.0 | MIT — https://github.com/airbnb/lottie-web |
| libpag | 4.1.8 | Apache-2.0 plus bundled third-party components; retain its complete LICENSE.txt — https://github.com/Tencent/libpag |
| svgaplayerweb | 2.3.2 | Apache-2.0 — https://github.com/svga/SVGAPlayer-Web |
| video-animation-player | 1.0.5 | MIT — Copyright Tencent, https://github.com/Tencent/vap |
| yyeva | 1.2.0 | Apache-2.0 — https://github.com/yylive/YYEVA-Web |
| spine-webgl / spine-core | 4.2.120 | **Spine Runtimes License**, not MIT/Apache — https://esotericsoftware.com/spine-runtimes-license |
| JSZip | 3.10.1 | MIT or GPL-3.0-or-later; use under MIT — https://github.com/Stuk/jszip |
| gifuct-js | 2.1.2 | MIT — https://github.com/matt-way/gifuct-js |
| UPNG.js | 2.1.0 | MIT — https://github.com/photopea/UPNG.js |
| Lucide | 0.468.0 | ISC — https://github.com/lucide-icons/lucide |

Spine integration and redistribution are governed by its own agreement. Its license and copyright notice are included in `licenses/`; use of this open-source project does not itself grant a Spine Editor license or waive any applicable requirement. The runtime is loaded only when opening Spine resources.

## Included samples

Original works `starlight.json`, `sparkle-sprite.png`, `sparkle.gif`, `sparkle.apng`, `sparkle.webp`, and `scope-mascot.{json,atlas,png}` are generated for MotionScope and released under the project MIT license. They contain no third-party characters or brands. Generator: `scripts/generate-samples.py`, `src/demo.js`.

Official repository examples are unmodified:

- `logo.pag`: Tencent/libpag, `assets/PAG_LOGO.pag` at commit `8a63822b0f64f899f07e36ca9f6a183adb7e5525`. Downloaded via GitHub media endpoint to resolve Git LFS. Repository license: Apache-2.0 with third-party notices. PAG branding belongs to its owner; inclusion is for format demonstration, not an endorsement.
- `rose.svga`: svga/SVGAPlayer-Web, `tests/samples/rose.svga` at commit `a218cbeca656a748d0384a06b07844e91e46b5fa`. Repository license: Apache-2.0.
- `vap-gift.mp4` and `vap-gift.json`: Tencent VAP Web demo, distributed in `video-animation-player@1.0.5`, `demo/src/components/demo.{mp4,json}`. MIT project. Filenames changed only to make the protocol explicit.
- `yyeva-gift.mp4`: yylive/YYEVA-Web, `projects/es5-demo/public/demo3/dynamic_264_mid.mp4` at commit `575cf8fc6e0b80b113a57fbd021b44bcd8357cd9`. Apache-2.0 project. Filename changed only.

Exact source URLs, sizes and SHA-256 checksums are recorded in `samples/sources.json`. These are examples for interoperability testing; no additional rights to any depicted brands or third-party content are asserted. If reusing example visuals outside the tool, verify applicable asset rights separately.

Tooling and transitive dependency license records are also included by `scripts/collect-licenses.mjs`. See package sources for the applicable terms; the inventory supplements, and does not replace, the actual license texts.
