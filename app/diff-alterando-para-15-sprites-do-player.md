# Diferenças do commit "Alterando para 15 sprites do player"

- Branch atual: `vel-caminhada`
- Base: `master`
- Commit: `9cd2ea9c9105b075b83aa461367fa15503792da4`

````diff
commit 9cd2ea9c9105b075b83aa461367fa15503792da4
Author: Sergio Pacheco <sergiospac@gmail.com>
Date:   Fri Jan 23 16:09:10 2026 -0300

    Alterando para 15 sprites do player

diff --git a/src/App.tsx b/src/App.tsx
index 5a4b7e7..4e4834f 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1634,7 +1634,7 @@ const GameContent: React.FC = () => {
       const animationSequence = ['down', 'right', 'up', 'left', 'down'];
       let currentSequenceIndex = 0;
       let frameCount = 0;
-      //const totalFrames = 20; // Total de frames da animação
+      //const totalFrames = 30; // Total de frames da animação
       const framesPerDirection = 4; // Frames por direção
 
       tiabelAnimationIntervalRef.current = setInterval(() => {
diff --git a/src/classes/Player.ts b/src/classes/Player.ts
index 9fcaa51..eefd176 100644
--- a/src/classes/Player.ts
+++ b/src/classes/Player.ts
@@ -1,6 +1,6 @@
 import { logPerfEvent, startPerfTimer } from '../utils/perfDiagnostics';
 
-export const WALKING_PACE_DURATION = 400; // 1.2 segundos para o movimento completo
+export const WALKING_PACE_DURATION = 800; // 1.2 segundos para o movimento completo
 
 /**
  * Representa a posição no mapa
@@ -77,7 +77,7 @@ export class Player {
    * Define a duração do passo (em ms) para a animação de caminhada.
    */
   setWalkingPaceDuration(duration: number): void {
-    const clampedDuration = Math.max(100, duration);
+    const clampedDuration = Math.max(1200, duration);
     this._walkingPaceDuration = clampedDuration;
   }
 
@@ -311,7 +311,7 @@ export class Player {
     const startPosition = { ...this._position };
     
     // Número de frames de sprite para mostrar durante a animação
-    const totalFrames = 10;
+    const totalFrames = 15;
     
     // Obter posições de tela inicial e final para interpolação
     const startScreenPos = this._movementValidator.getTileScreenPosition(startPosition);
@@ -348,7 +348,7 @@ export class Player {
           this._lastProgressChange = progress;
           //this._spriteFrame =  (this._spriteFrame + 1) % totalFrames;
         }
-        this._spriteFrame =  Math.floor(progress * 10) % totalFrames;
+        this._spriteFrame =  Math.floor(progress * totalFrames) % totalFrames;
         this._spriteFrame = this._spriteFrame >= 0 ? this._spriteFrame : 0;
         
         // === CORREÇÃO: GARANTIR DIREÇÃO CONSISTENTE DURANTE MOVIMENTO ===
diff --git a/src/utils/spriteSystem.ts b/src/utils/spriteSystem.ts
index 8e38c4a..67d8999 100644
--- a/src/utils/spriteSystem.ts
+++ b/src/utils/spriteSystem.ts
@@ -73,14 +73,14 @@ export const CHARACTER_SPRITE_CONFIG = {
   //   scale: 2
   // },
   maria: {
-    maxFrames: 10,
+    maxFrames: 15,
     spriteSize: { width: 128, height: 128 },
     containerSize: { width: 128, height: 128 }, // Aumentado para 160px
     backgroundSize: 'contain', // Ocupa todo o container
     scale: 1
   },
   caio: {
-    maxFrames: 10,
+    maxFrames: 15,
     spriteSize: { width: 128, height: 128 },
     containerSize: { width: 128, height: 128 }, // Aumentado para 160px
     backgroundSize: 'contain', // Ocupa todo o container
@@ -101,28 +101,28 @@ export const CHARACTER_SPRITE_CONFIG = {
     scale: 1.3
   },
   thiago: {
-    maxFrames: 10,
+    maxFrames: 15,
     spriteSize: { width: 128, height: 128 },
     containerSize: { width: 128, height: 128 },
     backgroundSize: 'contain',
     scale: 1
   },
   joao: {
-    maxFrames: 10,
+    maxFrames: 15,
     spriteSize: { width: 128, height: 128 },
     containerSize: { width: 128, height: 128 },
     backgroundSize: 'contain',
     scale: 1
   },
   julia: {
-    maxFrames: 10,
+    maxFrames: 15,
     spriteSize: { width: 128, height: 128 },
     containerSize: { width: 128, height: 128 },
     backgroundSize: 'contain',
     scale: 1
   },
   larissa: {
-    maxFrames: 10,
+    maxFrames: 15,
     spriteSize: { width: 128, height: 128 },
     containerSize: { width: 128, height: 128 },
     backgroundSize: 'contain',
diff --git a/src/utils/spriteSystemFixed.ts b/src/utils/spriteSystemFixed.ts
index ba847c1..34945df 100644
--- a/src/utils/spriteSystemFixed.ts
+++ b/src/utils/spriteSystemFixed.ts
@@ -34,11 +34,21 @@ function generateSpriteMappingForCharacter(characterName: string) {
         const usesShortMapping = ['thiago', 'joao', 'julia'].includes(characterName);
         let frameNumber: string;
         if (usesShortMapping) {
-          const shortMap = ['0001','0004','0006','0009','0011','0014','0016','0019','0021','0024'];
+          const shortMap = [];
+          if(characterName === 'tiabel') {
+            shortMap.push('0001','0004','0006','0009','0011','0014','0016','0019','0021','0024');
+          } else {
+          //Mapeamento de 2 em 2 (metade dos frames)
+            shortMap.push('0001', '0003', '0005', '0007', '0009', '0011', '0013', '0015', '0017', '0019', '0021', '0023', '0025', '0027', '0029');
+          }
           const idx = i % shortMap.length;
           frameNumber = shortMap[idx];
         } else {
-          frameNumber = (i * 3 + 1).toString().padStart(4, '0');
+          if(characterName === 'tiabel') {
+            frameNumber = (i * 3 + 1).toString().padStart(4, '0');
+          } else {
+            frameNumber = (i * 2 + 1).toString().padStart(4, '0');
+          }
         }
         mapping[direction][i] = `/assets/sprites/${characterName}/${characterName}_${code}_128/frame_${frameNumber}.png`;
       }
````
