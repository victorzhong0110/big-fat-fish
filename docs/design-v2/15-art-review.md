# 素材还原 · 试稿核对

用户要求先逐个查看角色效果，再做游戏界面。这里保存的是试稿，不会自动替换现有游戏角色；实际界面暂未修改。

- [Claude 像素螃蟹](art-drafts/claude-preview.png)：按参考手工还原。用户明确要求去掉上方的绿色框，当前图只保留螃蟹；[透明 SVG](art-drafts/claude-pixel-reconstruction.svg)。
- [大肥鱼](art-drafts/fish-basin-draft.png)和[绿色圆形图案](art-drafts/green-icon-draft.png)：从截图生成的透明试稿。
- [DeepSeek 无盆版](art-drafts/deepseek-no-basin-draft.png)：按用户要求去除蓝色加号和铁盆；被铁盆遮挡的身体由生成式编辑补画。该图作为独立试稿保留，原先拿盆的大肥鱼试稿未覆盖。
- GPT Pets 九张透明试稿：[Codex](art-drafts/codex-close-draft.png)、[Dewey](art-drafts/dewey-draft.png)、[Fireball](art-drafts/fireball-draft.png)、[Hoots](art-drafts/hoots-draft.png)、[Rocky](art-drafts/rocky-draft.png)、[Seedy](art-drafts/seedy-draft.png)、[Stacky](art-drafts/stacky-draft.png)、[BSOD](art-drafts/bsod-draft.png)、[Null Signal](art-drafts/null-signal-draft.png)。此前因环境中断遗漏的四张试稿已补回；这些图片尚未接入游戏。

除了 Claude 的手工像素稿，其余图使用内置图像编辑工具生成，造型、像素边缘和细节可能与参考图不同。它们仅供对照，不应标称逐像素复刻。原参考图除[绿色圆形图案](../../public/art/references/green-icon.png)外，环境中断后尚未保存到仓库。

## 透明试稿提示词

大肥鱼：`Edit the provided pixel-art game sprite. Remove only the black-and-magenta checkerboard background and replace it with genuine transparency. The checkerboard is not part of the character. Preserve the exact original character, its silhouette, pose, proportions, blue-violet hairstyle, white head ornament, face, clothing, hand position and especially the large gray iron basin with blue cross, as well as every pixel color and chunky pixel edge as faithfully as possible. Do not redesign, redraw, add details, add limbs, alter the pose, smooth, invent backgrounds, text, or shadows. Keep the entire original figure uncropped and centered. This is a faithful cleanup of the supplied sprite, not a new interpretation.`

绿色圆形图案：`Edit this exact supplied green circular character icon. Remove only its dark background to genuine transparency. Preserve its original silhouette, precise color, slightly irregular circle, and the exact two little dark slanted marks in the same relative positions, angles and sizes. It should look identical to the source icon, not like a redesign. Keep the complete icon centered with modest transparent margins. No extra face, limbs, text, shading, outlines, objects, or textures.`

Codex：`Edit this provided enlarged pixel-art Codex sprite by removing only the flat black background to transparency. Keep the exact original sprite as it appears, including its blue fluffy rounded hood, navy face, curved cyan closed eyes, blue short body, the white command prompt symbol >_ on its torso, both arms, feet, shading and every pixel edge. Do not simplify, change or replace any of these details. Do not add anything. Full character, centered, transparent background.`

Dewey、Fireball、Hoots、Rocky、Seedy、Stacky、BSOD、Null Signal：`Edit the supplied enlarged pixel-art {name} sprite. Remove only the flat dark background, replacing it with genuine transparency. Preserve the exact same character silhouette, proportions, pose, expression, eyes, colors, clothing, appendages, pixels, outlines, and all distinctive details from the image. Do not redesign, simplify, smooth, add extra features or change the art style. Keep the complete sprite centered, with transparent margins. This is a faithful background cleanup, not a new interpretation.`

DeepSeek 初次编辑：`Edit the provided existing pixel-art DeepSeek character. Remove the large gray iron washbasin entirely and remove every blue plus-sign/cross decoration, including those over the hair and the one on the basin. Replace the area previously covered by the basin with a simple matching dark blue outfit and relaxed arms, reconstructing only what must be uncovered. Keep the same chibi character's face, calm expression, blue-purple hair silhouette and side tail, white head ornament, pose, proportions, palette, chunky pixel outlines, pixel scale and visual style as close to the reference as possible. Do not redesign the face or hairstyle; do not add a replacement prop, stars, crosses, text, logos, new accessories, scenery, or shadows. Keep the figure centered with a truly transparent background. This is a faithful localized edit, not a new character design.`

DeepSeek 第二次编辑：`Make a single precise localized edit to this existing transparent pixel-art character: remove the remaining light-blue plus-sign / cross-shaped mark on the hair directly above the left eye, in the center of the bangs. Fill that small area with ordinary blue-purple hair pixels matching the adjacent hair. There must be no plus, cross, star, or sparkle decorations anywhere. Do not change anything else: preserve the exact face, eyes, hair outline, white headpiece, clothing, hands, pose, palette, pixel edges, full framing and transparency. Keep the basin absent; do not add any prop.`
