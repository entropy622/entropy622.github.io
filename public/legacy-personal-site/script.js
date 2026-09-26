document.addEventListener('DOMContentLoaded', () => {
    const accButtons = document.querySelectorAll('.accordion-button');

    // 添加手风琴效果
    accButtons.forEach(button => {
        button.addEventListener('click', () => {
            const content = button.nextElementSibling;
            content.style.display = (content.style.display === 'block') ? 'none' : 'block';

            // 关闭其他内容
            if (content.style.display === 'block') {
                document.querySelectorAll('.accordion-content').forEach(item => {
                    if (item !== content) item.style.display = 'none';
                });
            }
        });
    });

    const geometryContainer = document.querySelector('.geometry-container');
    let lastX = null;
    let lastY = null;
    let timeoutId = null; // 用于存储 setTimeout 的 ID

    document.addEventListener('mousemove', (e) => {
        const x = e.clientX;
        const y = e.clientY;

        // 计算鼠标移动速度
        let speedX = 0;
        let speedY = 0;

        if (lastX !== null && lastY !== null) {
            speedX = (x - lastX);
            speedY = (y - lastY);
        }

        lastX = x;
        lastY = y;

        // 清除之前的 timeout
        clearTimeout(timeoutId);

        // 生成几何体
        for (let i = 0; i < 5; i++) {
            const geometry = document.createElement('div');
            const type = ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)];
            geometry.classList.add('geometry', type);
            const size = Math.random() * 20 + 10;
            geometry.style.width = `${size}px`;
            geometry.style.height = `${size}px`;

            // 将几何体生成在鼠标附近
            geometry.style.left = `${x + (Math.random() - 0.5) * 20}px`; // 限制位置
            geometry.style.top = `${y + (Math.random() - 0.5) * 20}px`; // 限制位置

            // 设置初速度
            geometry.style.setProperty('--speedX', `${speedX * 0.1}px`);
            geometry.style.setProperty('--speedY', `${speedY * 0.1}px`);

            geometryContainer.appendChild(geometry);
            geometry.style.animation = `fall 5s ease forwards`;
            geometry.style.animationDelay = `${Math.random() * 2}s`;

            setTimeout(() => {
                geometry.remove();
            }, 1500); // 修改消失时间为 1.5 秒

            timeoutId = setTimeout(() => {
                lastX = null; // 重置 lastX 和 lastY
                lastY = null;
            }, 10); // 1秒后不再生成几何体
        }

        // 更新眼睛位置
        const character = document.querySelector('.character');
        const leftEye = document.querySelector('.left-eye');
        const rightEye = document.querySelector('.right-eye');

        const offsetX = e.clientX - character.getBoundingClientRect().left - character.clientWidth / 2;
        const offsetY = e.clientY - character.getBoundingClientRect().top - character.clientHeight / 2;
        const angleEye = Math.atan2(offsetY, offsetX);
        const distance = Math.min(Math.sqrt(offsetX ** 2 + offsetY ** 2), 10);

        const leftEyeX = Math.cos(angleEye) * distance;
        const leftEyeY = Math.sin(angleEye) * distance;

        leftEye.style.transform = `translate(${leftEyeX}px, ${leftEyeY}px)`;
        rightEye.style.transform = `translate(${leftEyeX}px, ${leftEyeY}px)`;
    });

    const character = document.querySelector('.character');
    const dialog = document.getElementById('dialog');

    character.addEventListener('click', () => {
        dialog.classList.add('show');
        setTimeout(() => {
            dialog.classList.remove('show');
        }, 3000);
    });
});