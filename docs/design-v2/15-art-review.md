# 当前角色复刻版本

已撤下重新绘制的40×40简化造型，恢复下列此前生成并经用户确认的版本。public/art/characters内的文件与历史生成文件逐字节一致；approved-art.json记录来源和校验值。查看[恢复后的角色总览](art-drafts/models-v2-overview.png)或首页角色图鉴。DeepSeek保留去盆去加号结果，Claude保留无绿框结果，九种GPT Pets不重新设计。游戏绘制保持原图比例和细节；当前移动和攻击仅为整图位移反馈，完整逐帧动作仍待制作。

# 素材还原 · 试稿核对

用户要求先逐个查看角色效果，再做游戏界面。这里保留角色试稿与参考记录。用户确认角色方向后，大肥鱼、Claude及当前游戏使用的七种GPT角色已接入V2静态画面。

- [Claude 像素螃蟹](art-drafts/claude-preview.png)：按参考手工还原。用户明确要求去掉上方的绿色框，当前图只保留螃蟹；[透明 SVG](art-drafts/claude-pixel-reconstruction.svg)。
- [大肥鱼](art-drafts/fish-basin-draft.png)和[绿色圆形图案](art-drafts/green-icon-draft.png)：从截图生成的透明试稿。
- [DeepSeek 无盆版](art-drafts/deepseek-no-basin-draft.png)：按用户要求去除蓝色加号和铁盆；被铁盆遮挡的身体由生成式编辑补画。该图作为独立试稿保留，原先拿盆的大肥鱼试稿未覆盖。
- GPT Pets 九张透明试稿：[Codex](art-drafts/codex-close-draft.png)、[Dewey](art-drafts/dewey-draft.png)、[Fireball](art-drafts/fireball-draft.png)、[Hoots](art-drafts/hoots-draft.png)、[Rocky](art-drafts/rocky-draft.png)、[Seedy](art-drafts/seedy-draft.png)、[Stacky](art-drafts/stacky-draft.png)、[BSOD](art-drafts/bsod-draft.png)、[Null Signal](art-drafts/null-signal-draft.png)。旧版本七种游戏内GPT敌人曾使用对应试稿；BSOD和Null Signal暂未成为游戏内敌人。

当前直接沿用这些已经确认的生成结果，不再重绘、简化或覆盖原文件。

## 透明试稿提示词

大肥鱼：`Edit the provided pixel-art game sprite. Remove only the black-and-magenta checkerboard background and replace it with genuine transparency. The checkerboard is not part of the character. Preserve the exact original character, its silhouette, pose, proportions, blue-violet hairstyle, white head ornament, face, clothing, hand position and especially the large gray iron basin with blue cross, as well as every pixel color and chunky pixel edge as faithfully as possible. Do not redesign, redraw, add details, add limbs, alter the pose, smooth, invent backgrounds, text, or shadows. Keep the entire original figure uncropped and centered. This is a faithful cleanup of the supplied sprite, not a new interpretation.`

绿色圆形图案：`Edit this exact supplied green circular character icon. Remove only its dark background to genuine transparency. Preserve its original silhouette, precise color, slightly irregular circle, and the exact two little dark slanted marks in the same relative positions, angles and sizes. It should look identical to the source icon, not like a redesign. Keep the complete icon centered with modest transparent margins. No extra face, limbs, text, shading, outlines, objects, or textures.`

Codex：`Edit this provided enlarged pixel-art Codex sprite by removing only the flat black background to transparency. Keep the exact original sprite as it appears, including its blue fluffy rounded hood, navy face, curved cyan closed eyes, blue short body, the white command prompt symbol >_ on its torso, both arms, feet, shading and every pixel edge. Do not simplify, change or replace any of these details. Do not add anything. Full character, centered, transparent background.`

Dewey、Fireball、Hoots、Rocky、Seedy、Stacky、BSOD、Null Signal：`Edit the supplied enlarged pixel-art {name} sprite. Remove only the flat dark background, replacing it with genuine transparency. Preserve the exact same character silhouette, proportions, pose, expression, eyes, colors, clothing, appendages, pixels, outlines, and all distinctive details from the image. Do not redesign, simplify, smooth, add extra features or change the art style. Keep the complete sprite centered, with transparent margins. This is a faithful background cleanup, not a new interpretation.`

DeepSeek 初次编辑：`Edit the provided existing pixel-art DeepSeek character. Remove the large gray iron washbasin entirely and remove every blue plus-sign/cross decoration, including those over the hair and the one on the basin. Replace the area previously covered by the basin with a simple matching dark blue outfit and relaxed arms, reconstructing only what must be uncovered. Keep the same chibi character's face, calm expression, blue-purple hair silhouette and side tail, white head ornament, pose, proportions, palette, chunky pixel outlines, pixel scale and visual style as close to the reference as possible. Do not redesign the face or hairstyle; do not add a replacement prop, stars, crosses, text, logos, new accessories, scenery, or shadows. Keep the figure centered with a truly transparent background. This is a faithful localized edit, not a new character design.`

DeepSeek 第二次编辑：`Make a single precise localized edit to this existing transparent pixel-art character: remove the remaining light-blue plus-sign / cross-shaped mark on the hair directly above the left eye, in the center of the bangs. Fill that small area with ordinary blue-purple hair pixels matching the adjacent hair. There must be no plus, cross, star, or sparkle decorations anywhere. Do not change anything else: preserve the exact face, eyes, hair outline, white headpiece, clothing, hands, pose, palette, pixel edges, full framing and transparency. Keep the basin absent; do not add any prop.`
