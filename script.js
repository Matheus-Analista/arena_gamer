/* ==========================================================================
   ARENA GAMER - LOGICA JAVASCRIPT & ANIMACOES (GRADIENT WAVES, GOOEY NAV,
   MAGIC BENTO, BUILD PRESETS, FAQ)
   ========================================================================== */


        const CLIENT_WHATSAPP_NUMBER = '5562999462437';

        // ==========================================================================
        // SHADER GRADIENT WAVES (3D RAYMARCHED PLASMA OCEAN WAVES)
        // ==========================================================================
        function initGradientWavesBackground() {
            // ACESSIBILIDADE / PERFORMANCE: respeita prefers-reduced-motion e
            // desativa o shader pesado em mobile (Metodo Jornada).
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            if (window.matchMedia('(max-width: 768px)').matches) return;

            const canvas = document.createElement('canvas');
            canvas.id = 'gradient-waves-canvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.zIndex = '-10';
            canvas.style.pointerEvents = 'none';
            canvas.style.opacity = '0.45';
            document.body.prepend(canvas);

            const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true });
            if (!gl) return;

            const vsSource = `#version 300 es
            in vec2 position;
            void main() {
              gl_Position = vec4(position, 0.0, 1.0);
            }`;

            const fsSource = `#version 300 es
            precision highp float;
            uniform vec2 iResolution;
            uniform float iTime;
            uniform float uSpeed;
            uniform float uAmplitude;
            uniform float uWaveScale;
            uniform float uWaveRatio;
            uniform float uSwell;
            uniform float uTurbulence;
            uniform float uTilt;
            uniform float uZoom;
            uniform float uHeight;
            uniform float uFogDepth;
            uniform float uSteps;
            uniform float uBrightness;
            uniform float uOpacity;
            uniform float uGrain;
            uniform float uGrainIntensity;
            uniform vec2 uMouse;
            uniform float uParallax;
            uniform bool uEnableMouse;
            uniform vec3 uHorizonColor;
            uniform vec3 uWaveColor;
            uniform vec3 uCrestColor;
            out vec4 fragColor;

            const float MAX_DIST = 20000.0;

            float hash21(vec2 p) {
              vec3 p3 = fract(vec3(p.xyx) * 0.1031);
              p3 += dot(p3, p3.yzx + 33.33);
              return fract((p3.x + p3.y) * p3.z);
            }

            float plasma(vec3 r, vec2 freq, vec4 tc) {
              float mx = r.x + tc.x;
              mx += uSwell * sin((r.y + mx) / 20.0 + tc.y);
              float my = r.y - tc.z;
              my += uTurbulence * cos(r.x / 23.0 + tc.w);
              return r.z - (sin(mx * freq.x) * uAmplitude + sin(my * freq.y) * uAmplitude + uHeight);
            }

            float raymarch(vec3 pos, vec3 dir, vec2 freq, vec4 tc) {
              float dist = 0.0;
              for (int i = 0; i < 128; i++) {
                if (float(i) >= uSteps) break;
                float dscene = plasma(pos + dist * dir, freq, tc);
                if (abs(dscene) < 0.1) break;
                dist += 0.9 * dscene;
                if (!(abs(dist) < MAX_DIST)) return MAX_DIST;
              }
              return dist;
            }

            void main() {
              float T = iTime * uSpeed;
              vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);
              vec4 tc = vec4(T / 0.130, T / 0.810, T / 0.200, T / 0.710);
              float c, s;
              float vfov = (3.14159 / 2.3) / max(uZoom, 0.05);
              vec3 cam = vec3(0.0, 0.0, 30.0);
              vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
              uv.x *= iResolution.x / iResolution.y;
              uv.y *= -1.0;

              vec3 dir = vec3(0.0, 0.0, -1.0);
              float ulen = length(uv);
              float xrot = vfov * ulen;
              c = cos(xrot); s = sin(xrot);
              dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
              vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);
              c = nuv.x; s = nuv.y;
              dir = mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0) * dir;
              c = cos(uTilt); s = sin(uTilt);
              dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;

              if (uEnableMouse) {
                float yaw = (uMouse.x - 0.5) * uParallax * 0.4;
                float pitch = (uMouse.y - 0.5) * uParallax * 0.4;
                c = cos(yaw); s = sin(yaw);
                dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;
                c = cos(pitch); s = sin(pitch);
                dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
              }

              float dist = raymarch(cam, dir, freq, tc);
              vec3 pos = cam + dist * dir;

              float t = clamp(uFogDepth / max(dist, 0.001), 0.0, 1.0);
              vec3 body = mix(uWaveColor, uCrestColor, clamp(pos.z * 0.08 + 0.5, 0.0, 1.0));
              vec3 col = mix(uHorizonColor, body, t);
              col *= uBrightness;
              col = clamp(col, 0.0, 1.0);

              float alpha = clamp(t, 0.0, 1.0) * uOpacity;
              if (uGrain > 0.5) {
                float g = hash21(gl_FragCoord.xy + mod(iTime, 64.0) * 11.0);
                alpha += (g - 0.5) * uGrainIntensity;
              }
              alpha = clamp(alpha, 0.0, 1.0);
              fragColor = vec4(col * alpha, alpha);
            }`;

            function compileShader(gl, type, source) {
                const shader = gl.createShader(type);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    gl.deleteShader(shader);
                    return null;
                }
                return shader;
            }

            const vertShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
            const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
            if (!vertShader || !fragShader) return;

            const program = gl.createProgram();
            gl.attachShader(program, vertShader);
            gl.attachShader(program, fragShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

            const posLoc = gl.getAttribLocation(program, 'position');
            const uResLoc = gl.getUniformLocation(program, 'iResolution');
            const uTimeLoc = gl.getUniformLocation(program, 'iTime');
            const uSpeedLoc = gl.getUniformLocation(program, 'uSpeed');
            const uAmplitudeLoc = gl.getUniformLocation(program, 'uAmplitude');
            const uWaveScaleLoc = gl.getUniformLocation(program, 'uWaveScale');
            const uWaveRatioLoc = gl.getUniformLocation(program, 'uWaveRatio');
            const uSwellLoc = gl.getUniformLocation(program, 'uSwell');
            const uTurbulenceLoc = gl.getUniformLocation(program, 'uTurbulence');
            const uTiltLoc = gl.getUniformLocation(program, 'uTilt');
            const uZoomLoc = gl.getUniformLocation(program, 'uZoom');
            const uHeightLoc = gl.getUniformLocation(program, 'uHeight');
            const uFogDepthLoc = gl.getUniformLocation(program, 'uFogDepth');
            const uStepsLoc = gl.getUniformLocation(program, 'uSteps');
            const uBrightnessLoc = gl.getUniformLocation(program, 'uBrightness');
            const uOpacityLoc = gl.getUniformLocation(program, 'uOpacity');
            const uGrainLoc = gl.getUniformLocation(program, 'uGrain');
            const uGrainIntensityLoc = gl.getUniformLocation(program, 'uGrainIntensity');
            const uMouseLoc = gl.getUniformLocation(program, 'uMouse');
            const uParallaxLoc = gl.getUniformLocation(program, 'uParallax');
            const uEnableMouseLoc = gl.getUniformLocation(program, 'uEnableMouse');
            const uHorizonColorLoc = gl.getUniformLocation(program, 'uHorizonColor');
            const uWaveColorLoc = gl.getUniformLocation(program, 'uWaveColor');
            const uCrestColorLoc = gl.getUniformLocation(program, 'uCrestColor');

            function resize() {
                const width = window.innerWidth;
                const height = window.innerHeight;
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, width, height);
            }
            window.addEventListener('resize', resize);
            resize();

            let targetMouseX = 0.5, targetMouseY = 0.5;
            let currentMouseX = 0.5, currentMouseY = 0.5;

            window.addEventListener('pointermove', (e) => {
                targetMouseX = e.clientX / window.innerWidth;
                targetMouseY = 1.0 - (e.clientY / window.innerHeight);
            });

            const startTime = performance.now();

            function render(now) {
                gl.useProgram(program);

                currentMouseX += 0.05 * (targetMouseX - currentMouseX);
                currentMouseY += 0.05 * (targetMouseY - currentMouseY);

                gl.enableVertexAttribArray(posLoc);
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

                gl.uniform2f(uResLoc, canvas.width, canvas.height);
                gl.uniform1f(uTimeLoc, (now - startTime) * 0.001);
                gl.uniform1f(uSpeedLoc, 0.25);
                gl.uniform1f(uAmplitudeLoc, 2.5);
                gl.uniform1f(uWaveScaleLoc, 0.6);
                gl.uniform1f(uWaveRatioLoc, 0.9);
                gl.uniform1f(uSwellLoc, 35.0);
                gl.uniform1f(uTurbulenceLoc, 20.0);
                gl.uniform1f(uTiltLoc, 1.11);
                gl.uniform1f(uZoomLoc, 1.0);
                gl.uniform1f(uHeightLoc, 5.5);
                gl.uniform1f(uFogDepthLoc, 16.0);
                gl.uniform1f(uStepsLoc, 60.0);
                gl.uniform1f(uBrightnessLoc, 0.95);
                gl.uniform1f(uOpacityLoc, 0.85);
                gl.uniform1f(uGrainLoc, 1.0);
                gl.uniform1f(uGrainIntensityLoc, 0.04);
                gl.uniform2f(uMouseLoc, currentMouseX, currentMouseY);
                gl.uniform1f(uParallaxLoc, 0.4);
                gl.uniform1i(uEnableMouseLoc, 1);

                gl.uniform3f(uHorizonColorLoc, 0.043, 0.043, 0.051);
                gl.uniform3f(uWaveColorLoc, 0.059, 0.106, 0.220);
                gl.uniform3f(uCrestColorLoc, 0.184, 0.435, 1.0);

                gl.drawArrays(gl.TRIANGLES, 0, 3);
                requestAnimationFrame(render);
            }
            requestAnimationFrame(render);
        }

        // ==========================================================================
        // ANIMAÇÃO MAGIC BENTO (GLOBAL SPOTLIGHT + PARTICLE STARS + TILT + RIPPLE)
        // ==========================================================================
        function initMagicBento() {
            const spotlightRadius = 350;
            const particleCount = 10;
            const glowColorRGB = '47, 111, 255';

            // Criar Global Spotlight Element
            const spotlight = document.createElement('div');
            spotlight.className = 'global-spotlight';
            document.body.appendChild(spotlight);

            const bentoSections = document.querySelectorAll('.magic-bento-section');
            const allCards = document.querySelectorAll('.magic-bento-card');

            // 1. GLOBAL SPOTLIGHT & BORDER GLOW SEGUE O MOUSE NAS SEÇÕES
            document.addEventListener('mousemove', (e) => {
                let insideSection = false;

                bentoSections.forEach(section => {
                    const rect = section.getBoundingClientRect();
                    if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                        insideSection = true;
                    }
                });

                if (!insideSection) {
                    spotlight.style.opacity = '0';
                    allCards.forEach(card => card.style.setProperty('--glow-intensity', '0'));
                    return;
                }

                spotlight.style.opacity = '0.85';
                spotlight.style.left = `${e.clientX}px`;
                spotlight.style.top = `${e.clientY}px`;

                const proximity = spotlightRadius * 0.5;
                const fadeDistance = spotlightRadius * 0.85;

                allCards.forEach(card => {
                    const rect = card.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(rect.width, rect.height) / 2;
                    const effDistance = Math.max(0, distance);

                    let glowIntensity = 0;
                    if (effDistance <= proximity) {
                        glowIntensity = 1;
                    } else if (effDistance <= fadeDistance) {
                        glowIntensity = (fadeDistance - effDistance) / (fadeDistance - proximity);
                    }

                    const relX = ((e.clientX - rect.left) / rect.width) * 100;
                    const relY = ((e.clientY - rect.top) / rect.height) * 100;

                    card.style.setProperty('--glow-x', `${relX}%`);
                    card.style.setProperty('--glow-y', `${relY}%`);
                    card.style.setProperty('--glow-intensity', glowIntensity.toString());
                    card.style.setProperty('--glow-radius', `${spotlightRadius}px`);
                });
            });

            // 2. INTERATIVIDADE INDIVIDUAL DOS CARDS (PARTÍCULAS, TILT 3D, MAGNETISMO E RIPPLE)
            allCards.forEach(card => {
                let particles = [];
                let isHovered = false;

                function spawnParticles() {
                    if (!isHovered) return;
                    const rect = card.getBoundingClientRect();

                    for (let i = 0; i < particleCount; i++) {
                        setTimeout(() => {
                            if (!isHovered) return;
                            const p = document.createElement('div');
                            p.className = 'particle';
                            p.style.left = `${Math.random() * rect.width}px`;
                            p.style.top = `${Math.random() * rect.height}px`;
                            card.appendChild(p);
                            particles.push(p);

                            if (window.gsap) {
                                gsap.fromTo(p, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3 });
                                gsap.to(p, {
                                    x: (Math.random() - 0.5) * 80,
                                    y: (Math.random() - 0.5) * 80,
                                    rotation: Math.random() * 360,
                                    duration: 2 + Math.random() * 2,
                                    repeat: -1,
                                    yoyo: true,
                                    ease: 'none'
                                });
                                gsap.to(p, {
                                    opacity: 0.2,
                                    duration: 1.5,
                                    repeat: -1,
                                    yoyo: true,
                                    ease: 'power2.inOut'
                                });
                            }
                        }, i * 120);
                    }
                }

                function clearParticles() {
                    particles.forEach(p => {
                        if (window.gsap) {
                            gsap.to(p, {
                                scale: 0,
                                opacity: 0,
                                duration: 0.3,
                                onComplete: () => p.remove()
                            });
                        } else {
                            p.remove();
                        }
                    });
                    particles = [];
                }

                card.addEventListener('mouseenter', () => {
                    isHovered = true;
                    spawnParticles();
                });

                card.addEventListener('mouseleave', () => {
                    isHovered = false;
                    clearParticles();

                    if (window.gsap) {
                        gsap.to(card, {
                            rotateX: 0,
                            rotateY: 0,
                            x: 0,
                            y: 0,
                            duration: 0.4,
                            ease: 'power2.out'
                        });
                    }
                });

                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    const rotateX = ((y - centerY) / centerY) * -8;
                    const rotateY = ((x - centerX) / centerX) * 8;
                    const magnetX = (x - centerX) * 0.04;
                    const magnetY = (y - centerY) * 0.04;

                    if (window.gsap) {
                        gsap.to(card, {
                            rotateX: rotateX,
                            rotateY: rotateY,
                            x: magnetX,
                            y: magnetY,
                            duration: 0.2,
                            ease: 'power2.out',
                            transformPerspective: 1000
                        });
                    }
                });

                // Efeito Ripple ao Clicar
                card.addEventListener('click', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const maxDist = Math.max(
                        Math.hypot(x, y),
                        Math.hypot(x - rect.width, y),
                        Math.hypot(x, y - rect.height),
                        Math.hypot(x - rect.width, y - rect.height)
                    );

                    const ripple = document.createElement('div');
                    ripple.style.cssText = `
                        position: absolute;
                        width: ${maxDist * 2}px;
                        height: ${maxDist * 2}px;
                        border-radius: 50%;
                        background: radial-gradient(circle, rgba(${glowColorRGB}, 0.5) 0%, rgba(${glowColorRGB}, 0.2) 35%, transparent 70%);
                        left: ${x - maxDist}px;
                        top: ${y - maxDist}px;
                        pointer-events: none;
                        z-index: 100;
                    `;

                    card.appendChild(ripple);

                    if (window.gsap) {
                        gsap.fromTo(ripple, { scale: 0, opacity: 1 }, {
                            scale: 1,
                            opacity: 0,
                            duration: 0.75,
                            ease: 'power2.out',
                            onComplete: () => ripple.remove()
                        });
                    } else {
                        setTimeout(() => ripple.remove(), 750);
                    }
                });
            });
        }

        const BUILD_PRESETS = {
            esports: {
                badge: 'Recomendado para eSports (240Hz+)',
                title: 'Setup Competitivo High-FPS',
                desc: 'Foco total em taxas de quadros altíssimas (FPS) e mínima latência para jogos competitivos como CS2, Valorant, Fortnite e Apex Legends.',
                cpu: 'AMD Ryzen 7 7800X3D',
                gpu: 'NVIDIA GeForce RTX 4070 12GB',
                ram: '32GB DDR5 6000MHz (2x16GB)',
                cooler: 'Water Cooler 240mm ARGB Dual Fan',
                storage: '1TB SSD NVMe M.2 Gen4 (7000MB/s)',
                perf: '⚡ 240+ FPS cravados em 1080p Competitive',
                msg: 'Olá! Montei a opção Competitivo (eSports 240Hz+) no site da Arena Gamer e gostaria de receber um orçamento sem compromisso.'
            },
            ultra: {
                badge: 'Recomendado para 4K & Ray Tracing',
                title: 'Setup Jogos AAA no Ultra',
                desc: 'Projetado para rodar os lançamentos mais pesados (Cyberpunk 2077, GTA VI Ready, Elden Ring, Black Myth Wukong) na qualidade máxima.',
                cpu: 'AMD Ryzen 7 7800X3D / Intel i7 14700K',
                gpu: 'NVIDIA GeForce RTX 4070 Ti Super 16GB',
                ram: '32GB DDR5 6000MHz High-Speed',
                cooler: 'Water Cooler 360mm ARGB Triple Fan',
                storage: '2TB SSD NVMe M.2 Gen4 (7300MB/s)',
                perf: '🚀 100+ FPS em 4K Ultra com Ray Tracing & DLSS 3',
                msg: 'Olá! Montei a opção Jogos AAA no Ultra (4K / Ray Tracing) no site da Arena Gamer e gostaria de solicitar um orçamento.'
            },
            stream: {
                badge: 'Recomendado para Live Streaming & Edição',
                title: 'Setup Streamer & Content Creator',
                desc: 'Poder de processamento duplo para fazer lives em 1080p60 sem perder desempenho no jogo, além de renderizar vídeos em 4K rapidamente.',
                cpu: 'Intel Core i7 14700K / Ryzen 9 7900X',
                gpu: 'NVIDIA GeForce RTX 4070 Super 12GB (NVENC)',
                ram: '64GB DDR5 6000MHz (Dual Channel)',
                cooler: 'Water Cooler 360mm Alta Eficiência',
                storage: '2TB SSD NVMe M.2 + 1TB SSD Secundário',
                perf: '🎥 Live Stream 1080p60 fluida sem queda de FPS no jogo',
                msg: 'Olá! Montei a opção Streaming e Criação de Conteúdo no site da Arena Gamer e gostaria de um orçamento personalizado.'
            },
            work: {
                badge: 'Recomendado para Uso Profissional & IA',
                title: 'Workstation 3D, Render & Inteligência Artificial',
                desc: 'Máquina de alta fidelidade para profissionais de Arquitetura, Engenharia, Renderização em 3D (Blender/AutoCAD) e modelos locais de IA.',
                cpu: 'AMD Ryzen 9 7950X / Intel i9 14900K',
                gpu: 'NVIDIA GeForce RTX 4080 Super 16GB VRAM',
                ram: '64GB/128GB DDR5 6000MHz ECC Support',
                cooler: 'Water Cooler Custom / 360mm Industrial',
                storage: '2TB SSD NVMe Gen4 (7400MB/s) + RAID Support',
                perf: '💻 Renders 3x mais rápidos & Capacidade para IA Local',
                msg: 'Olá! Montei a opção Trabalho Pesado / Render 3D / IA no site da Arena Gamer e quero um orçamento para uso profissional.'
            }
        };

        class GooeyNavAnimation {
            constructor() {
                this.menu = document.getElementById('gooey-menu');
                this.pill = document.getElementById('gooey-pill');
                this.canvas = document.getElementById('gooey-canvas');
                if (!this.menu || !this.pill || !this.canvas) return;

                this.ctx = this.canvas.getContext('2d');
                this.items = Array.from(this.menu.querySelectorAll('.gooey-nav-item'));
                this.particles = [];
                this.animating = false;

                this.init();
            }

            init() {
                this.resizeCanvas();
                window.addEventListener('resize', () => {
                    this.resizeCanvas();
                    this.updatePillPosition();
                });

                this.items.forEach((item) => {
                    item.addEventListener('mouseenter', () => this.movePillTo(item));
                    item.addEventListener('click', () => {
                        this.items.forEach(i => i.classList.remove('active'));
                        item.classList.add('active');
                        this.movePillTo(item);
                        this.spawnParticles(item);
                    });
                });

                const activeItem = this.menu.querySelector('.gooey-nav-item.active') || this.items[0];
                setTimeout(() => this.movePillTo(activeItem), 100);
            }

            resizeCanvas() {
                const rect = this.menu.getBoundingClientRect();
                this.canvas.width = rect.width + 40;
                this.canvas.height = rect.height + 40;
            }

            updatePillPosition() {
                const activeItem = this.menu.querySelector('.gooey-nav-item.active') || this.items[0];
                this.movePillTo(activeItem);
            }

            movePillTo(item) {
                const menuRect = this.menu.getBoundingClientRect();
                const itemRect = item.getBoundingClientRect();

                const left = itemRect.left - menuRect.left;
                const width = itemRect.width;

                this.pill.style.transform = `translateX(${left}px)`;
                this.pill.style.width = `${width}px`;
            }

            spawnParticles(targetItem) {
                const itemRect = targetItem.getBoundingClientRect();
                const menuRect = this.menu.getBoundingClientRect();

                const centerX = (itemRect.left - menuRect.left) + itemRect.width / 2 + 20;
                const centerY = itemRect.height / 2 + 20;

                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1.5 + Math.random() * 3.5;
                    this.particles.push({
                        x: centerX,
                        y: centerY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        radius: 4 + Math.random() * 8,
                        alpha: 1,
                        decay: 0.03 + Math.random() * 0.03
                    });
                }

                if (!this.animating) {
                    this.animating = true;
                    this.renderParticles();
                }
            }

            renderParticles() {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                this.particles.forEach((p, index) => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.alpha -= p.decay;

                    if (p.alpha <= 0) {
                        this.particles.splice(index, 1);
                    } else {
                        this.ctx.beginPath();
                        this.ctx.arc(p.x, p.y, p.radius * p.alpha, 0, Math.PI * 2);
                        this.ctx.fillStyle = `rgba(47, 111, 255, ${p.alpha})`;
                        this.ctx.fill();
                    }
                });

                if (this.particles.length > 0) {
                    requestAnimationFrame(() => this.renderParticles());
                } else {
                    this.animating = false;
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            // INICIALIZAR SHADER GRADIENT WAVES 3D AO FUNDO
            initGradientWavesBackground();

            // INICIALIZAR ANIMAÇÃO MAGIC BENTO NAS SEÇÕES SERVIÇOS E PROCESSO
            initMagicBento();

            // INICIALIZAR GOOEY NAV
            new GooeyNavAnimation();

            const mobileToggle = document.getElementById('mobile-toggle');
            const mobileDrawer = document.getElementById('mobile-drawer');
            const mobileLinks = document.querySelectorAll('.mobile-link');

            if (mobileToggle && mobileDrawer) {
                mobileToggle.addEventListener('click', () => {
                    mobileDrawer.classList.toggle('open');
                });

                mobileLinks.forEach(link => {
                    link.addEventListener('click', () => {
                        mobileDrawer.classList.remove('open');
                    });
                });
            }

            const tabs = document.querySelectorAll('.builder-tab');
            const badgeEl = document.getElementById('builder-badge');
            const titleEl = document.getElementById('builder-title');
            const descEl = document.getElementById('builder-desc');
            const cpuEl = document.getElementById('spec-cpu');
            const gpuEl = document.getElementById('spec-gpu');
            const ramEl = document.getElementById('spec-ram');
            const coolerEl = document.getElementById('spec-cooler');
            const storageEl = document.getElementById('spec-storage');
            const perfEl = document.getElementById('builder-perf');
            const whatsappBtn = document.getElementById('builder-whatsapp-btn');

            function updatePreset(presetKey) {
                const data = BUILD_PRESETS[presetKey];
                if (!data) return;

                badgeEl.textContent = data.badge;
                titleEl.textContent = data.title;
                descEl.textContent = data.desc;
                cpuEl.textContent = data.cpu;
                gpuEl.textContent = data.gpu;
                ramEl.textContent = data.ram;
                coolerEl.textContent = data.cooler;
                storageEl.textContent = data.storage;
                perfEl.textContent = data.perf;

                const encodedMsg = encodeURIComponent(data.msg);
                whatsappBtn.href = `https://wa.me/${CLIENT_WHATSAPP_NUMBER}?text=${encodedMsg}`;
            }

            function selectTab(tab) {
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                    t.setAttribute('tabindex', '-1');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                tab.setAttribute('tabindex', '0');

                const presetKey = tab.getAttribute('data-preset');
                updatePreset(presetKey);
            }

            tabs.forEach((tab, index) => {
                tab.addEventListener('click', () => {
                    selectTab(tab);
                    tab.focus();
                });

                tab.addEventListener('keydown', (e) => {
                    let nextIndex = null;
                    if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
                    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
                    else if (e.key === 'Home') nextIndex = 0;
                    else if (e.key === 'End') nextIndex = tabs.length - 1;

                    if (nextIndex !== null) {
                        e.preventDefault();
                        const nextTab = tabs[nextIndex];
                        nextTab.focus();
                        selectTab(nextTab);
                    }
                });
            });

            selectTab(tabs[0]);

            const faqItems = document.querySelectorAll('.faq-item');
            faqItems.forEach(item => {
                const question = item.querySelector('.faq-question');

                function setOpen(open) {
                    item.classList.toggle('active', open);
                    question.setAttribute('aria-expanded', open ? 'true' : 'false');
                }

                question.addEventListener('click', () => {
                    const isActive = item.classList.contains('active');
                    faqItems.forEach(i => {
                        const q = i.querySelector('.faq-question');
                        if (q && q !== question) {
                            i.classList.remove('active');
                            q.setAttribute('aria-expanded', 'false');
                        }
                    });
                    setOpen(!isActive);
                });

                question.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        question.click();
                    }
                });
            });

            const yearEl = document.getElementById('current-year');
            if (yearEl) yearEl.textContent = new Date().getFullYear();
        });
    