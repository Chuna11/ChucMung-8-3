let fullscreenRequested = false;
let textSequenceFinished = false;

// Hằng số dùng chung – tránh magic number, dễ chỉnh responsive
const MOBILE_BREAKPOINT = 600;
const PLANE_MOBILE_BREAKPOINT = 768;

function debounce(fn, ms) {
    var t;
    return function () {
        clearTimeout(t);
        t = setTimeout(fn, ms);
    };
}

function requestFullScreen() {
    const el = document.documentElement;
    let promise;
    if (el.requestFullscreen) {
        promise = el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
        promise = el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
        promise = el.msRequestFullscreen();
    }

    if (promise && promise.catch) {
        promise.catch(err => {
            console.warn("Fullscreen request failed:", err.message);
        });
    }
}

function handleFirstInteract() {
    if (!fullscreenRequested) {
        requestFullScreen();
        fullscreenRequested = true;
    }
    playSound();
}

document.addEventListener('click', handleFirstInteract, { once: true });
document.addEventListener('touchstart', handleFirstInteract, { once: true });

document.addEventListener('fullscreenchange', () => {
    resizeCanvas();
    S.Drawing.adjustCanvas();
});



var S = {
    init: function () {
        S.Drawing.init('.canvas');
        document.body.classList.add('body--ready');
        S.Shape.switchShape(S.ShapeBuilder.letter("🎁"));

        S.Drawing.loop(function () {
            S.Shape.render();
        });
        const canvas = document.querySelector('.canvas');
        let countdownSequence = "#countdown 3|CHÚC MỪNG|NGÀY 8/3|2026|CHÚC MẤY CHỊ|VUI VẺ|HẠNH PHÚC";
        let sequenceStarted = false; // tránh chạy countdown 2 lần trên mobile

        fetch('countdown.txt')
            .then(res => res.text())
            .then(text => {
                if (text && text.trim().length > 0) countdownSequence = text.trim();
            })
            .catch(err => console.error("Lỗi tải countdown:", err));

        const startSequence = () => {
            if (sequenceStarted) return;
            sequenceStarted = true;

            canvas.removeEventListener('click', startSequence);
            canvas.removeEventListener('touchstart', startSequence);
            handleFirstInteract();
            playSound();
            S.UI.simulate(countdownSequence);
        };

        canvas.addEventListener('click', startSequence);
        canvas.addEventListener('touchstart', startSequence);
    }
};
S.Drawing = (function () {
    var canvas,
        context,
        renderFn,
        requestFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1500 / 60);
            };
    return {
        init: function (el) {
            canvas = document.querySelector(el);
            context = canvas.getContext('2d');
            this.adjustCanvas();
            window.addEventListener('resize', debounce(function () {
                S.Drawing.adjustCanvas();
            }, 120));
        },
        loop: function (fn) {
            renderFn = !renderFn ? fn : renderFn;
            this.clearFrame();
            // Máy bay vẽ trước làm background (xa xa, phía sau chữ)
            if (typeof renderPlanes === 'function') {
                renderPlanes();
            }
            renderFn();
            requestFrame.call(window, this.loop.bind(this));
        },
        adjustCanvas: function () {
            canvas.width = document.documentElement.clientWidth;
            canvas.height = document.documentElement.clientHeight;
        },
        clearFrame: function () {
            context.clearRect(0, 0, canvas.width, canvas.height);
        },
        getArea: function () {
            return { w: canvas.width, h: canvas.height };
        },
        getContext: function () {
            return context;
        },
        drawCircle: function (p, c) {
            context.fillStyle = c.render();
            context.beginPath();
            context.arc(p.x, p.y, p.z, 0, 2 * Math.PI, true);
            context.closePath();
            context.fill();
        }
    };
}());
S.UI = (function () {
    var interval,
        currentAction,
        time,
        maxShapeSize = 30,
        sequence = [],
        cmd = '#';
    function formatTime(date) {
        var h = date.getHours(),
            m = date.getMinutes(),
            m = m < 10 ? '0' + m : m;
        return h + ':' + m;
    }
    function getValue(value) {
        return value && value.split(' ')[1];
    }
    function getAction(value) {
        value = value && value.split(' ')[0];
        return value && value[0] === cmd && value.substring(1);
    }
    function timedAction(fn, delay, max, reverse) {
        clearInterval(interval);
        currentAction = reverse ? max : 1;
        fn(currentAction);
        if (!max || (!reverse && currentAction < max) || (reverse && currentAction > 0)) {
            interval = setInterval(function () {
                currentAction = reverse ? currentAction - 1 : currentAction + 1;

                if (reverse && currentAction < 0) {
                    clearInterval(interval);
                    return;
                }

                fn(currentAction);
                if ((!reverse && max && currentAction === max) || (reverse && currentAction === 0)) {
                    clearInterval(interval);
                }
            }, delay);
        }
    }
    function performAction(value) {
        var action,
            value,
            current;
        sequence = typeof (value) === 'object' ? value : sequence.concat(value.split('|'));
        timedAction(function (index) {
            current = sequence.shift();
            action = getAction(current);
            value = getValue(current);
            switch (action) {
                case 'countdown':
                    value = parseInt(value) || 10;
                    value = value > 0 ? value : 10;
                    timedAction(function (index) {
                        if (index === 0) {
                            // Cho tiếng pháo nổ ngay khi countdown về 0 (trước khi mở quà / chuyển cảnh)
                            if (window.playFireworkSound) {
                                window.playFireworkSound();
                            }
                            if (sequence.length === 0) {
                                clearInterval(interval);

                                textSequenceFinished = true;

                                // Phai mờ và chuyển sang hiệu ứng index2
                                setTimeout(() => {
                                    var el = document.querySelector(".canvas");
                                    if (el) {
                                        el.style.transition = "opacity 2s ease";
                                        el.style.opacity = "0";
                                        setTimeout(() => {
                                            el.style.display = "none";
                                            if (window.startSection2) window.startSection2();
                                        }, 2000);
                                    }
                                }, 2000);
                            } else {
                                performAction(sequence);
                            }
                        } else {
                            S.Shape.switchShape(S.ShapeBuilder.letter(index), true);
                        }
                    }, 2000, value, true);
                    break;
                case 'rectangle':
                    value = value && value.split('x');
                    value = (value && value.length === 2) ? value : [maxShapeSize, maxShapeSize / 2];
                    S.Shape.switchShape(S.ShapeBuilder.rectangle(Math.min(maxShapeSize, parseInt(value[0])), Math.min(maxShapeSize, parseInt(value[1]))));
                    break;
                case 'circle':
                    value = parseInt(value) || maxShapeSize;
                    value = Math.min(value, maxShapeSize);
                    S.Shape.switchShape(S.ShapeBuilder.circle(value));
                    break;
                case 'time':
                    var t = formatTime(new Date());
                    if (sequence.length > 0) {
                        S.Shape.switchShape(S.ShapeBuilder.letter(t));
                    } else {
                        timedAction(function () {
                            t = formatTime(new Date());
                            if (t !== time) {
                                time = t;
                                S.Shape.switchShape(S.ShapeBuilder.letter(time));
                            }
                        }, 1000);
                    }
                    break;
                default:
                    S.Shape.switchShape(S.ShapeBuilder.letter(current[0] === cmd ? 'HacPai' : current));
            }
        }, 6000, sequence.length);
    }
    return {
        simulate: function (action) {
            performAction(action);
        }
    };
}());
S.Point = function (args) {
    this.x = args.x;
    this.y = args.y;
    this.z = args.z;
    this.a = args.a;
    this.h = args.h;
};
S.Color = function (r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
};
S.Color.prototype = {
    render: function () {
        return 'rgba(' + this.r + ',' + +this.g + ',' + this.b + ',' + this.a + ')';
    }
};
S.Dot = function (x, y) {
    this.p = new S.Point({
        x: x,
        y: y,
        z: window.innerWidth < MOBILE_BREAKPOINT ? 3 : 5,
        a: 1,
        h: 0
    });
    this.e = 0.07;
    this.s = true;
    this.c = new S.Color(255, 255, 0, this.p.a);
    this.t = this.clone();
    this.q = [];
};
S.Dot.prototype = {
    clone: function () {
        var p = this.p;
        return new S.Point({
            x: p.x,
            y: p.y,
            z: p.z,
            a: p.a,
            h: p.h
        });
    },
    _draw: function () {
        this.c.a = this.p.a;
        S.Drawing.drawCircle(this.p, this.c);
    },
    _moveTowards: function (n) {
        var details = this.distanceTo(n, true),
            dx = details[0],
            dy = details[1],
            d = details[2],
            e = this.e * d;
        if (this.p.h === -1) {
            this.p.x = n.x;
            this.p.y = n.y;
            return true;
        }
        if (d > 1) {
            this.p.x -= ((dx / d) * e);
            this.p.y -= ((dy / d) * e);
        } else {
            if (this.p.h > 0) {
                this.p.h--;
            } else {
                return true;
            }
        }
        return false;
    },
    _update: function () {
        if (this._moveTowards(this.t)) {
            var p = this.q.shift();
            if (p) {
                this.t.x = p.x || this.p.x;
                this.t.y = p.y || this.p.y;
                this.t.z = p.z || this.p.z;
                this.t.a = p.a || this.p.a;
                this.p.h = p.h || 0;
            } else {
                if (this.s) {
                    this.p.x -= Math.sin(Math.random() * 3.142);
                    this.p.y -= Math.sin(Math.random() * 3.142);
                } else {
                    this.move(new S.Point({
                        x: this.p.x + (Math.random() * 50) - 25,
                        y: this.p.y + (Math.random() * 50) - 25
                    }));
                }
            }
        }
        d = this.p.a - this.t.a;
        this.p.a = Math.max(0.1, this.p.a - (d * 0.05));
        d = this.p.z - this.t.z;
        this.p.z = Math.max(1, this.p.z - (d * 0.05));
    },
    distanceTo: function (n, details) {
        var dx = this.p.x - n.x,
            dy = this.p.y - n.y,
            d = Math.sqrt(dx * dx + dy * dy);
        return details ? [dx, dy, d] : d;
    },
    move: function (p, avoidStatic) {
        if (!avoidStatic || (avoidStatic && this.distanceTo(p) > 1)) {
            this.q.push(p);
        }
    },
    render: function () {
        this._update();
        this._draw();
    }
};
S.ShapeBuilder = (function () {
    var gap = window.innerWidth < MOBILE_BREAKPOINT ? 7 : 13,
        shapeCanvas = document.createElement('canvas'),
        shapeContext = shapeCanvas.getContext('2d', { willReadFrequently: true }),
        fontSize = 500,
        fontFamily = '"Denk One", sans-serif';
    function fit() {
        gap = window.innerWidth < MOBILE_BREAKPOINT ? 7 : 13;
        shapeCanvas.width = window.innerWidth;
        shapeCanvas.height = window.innerHeight;
        shapeContext.fillStyle = 'red';
        shapeContext.textBaseline = 'middle';
        shapeContext.textAlign = 'center';
    }
    function processCanvas() {
        var pixels = shapeContext.getImageData(0, 0, shapeCanvas.width, shapeCanvas.height).data;
        var dots = [],
            fx = shapeCanvas.width,
            fy = shapeCanvas.height,
            w = 0,
            h = 0;

        for (var y = 0; y < shapeCanvas.height; y += gap) {
            for (var x = 0; x < shapeCanvas.width; x += gap) {
                var p = (y * shapeCanvas.width + x) * 4;
                if (pixels[p + 3] > 0) {
                    dots.push(new S.Point({
                        x: x,
                        y: y
                    }));
                    w = x > w ? x : w;
                    h = y > h ? y : h;
                    fx = x < fx ? x : fx;
                    fy = y < fy ? y : fy;
                }
            }
        }
        return { dots: dots, w: w + fx, h: h + fy };
    }
    function setFontSize(s) {
        shapeContext.font = 'bold ' + s + 'px ' + fontFamily;
    }
    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
    function init() {
        fit();
        window.addEventListener('resize', debounce(fit, 120));
    }
    // Init
    init();
    return {
        imageFile: function (url, callback) {
            var image = new Image(),
                a = S.Drawing.getArea();
            image.onload = function () {
                shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
                shapeContext.drawImage(this, 0, 0, a.h * 0.6, a.h * 0.6);
                callback(processCanvas());
            };
            image.onerror = function () {
                callback(S.ShapeBuilder.letter('What?'));
            };
            image.src = url;
        },
        circle: function (d) {
            var r = Math.max(0, d) / 2;
            shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
            shapeContext.beginPath();
            shapeContext.arc(r * gap, r * gap, r * gap, 0, 2 * Math.PI, false);
            shapeContext.fill();
            shapeContext.closePath();
            return processCanvas();
        },
        letter: function (l) {
            var s = 0;
            var text = l.toString();
            if (window.innerWidth < MOBILE_BREAKPOINT && text.includes(' ')) {
                text = text.split(' ').join('\n');
            }
            var lines = text.split('\n');
            var maxW = 0;

            setFontSize(fontSize);
            lines.forEach(line => {
                var w = shapeContext.measureText(line).width;
                if (w > maxW) maxW = w;
            });

            s = Math.min(fontSize,
                (shapeCanvas.width / maxW) * 0.8 * fontSize,
                (shapeCanvas.height / (lines.length * fontSize * 1.2)) * 0.8 * fontSize);
            setFontSize(s);

            shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
            var lineHeight = s * 1.2;
            var startY = shapeCanvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

            lines.forEach((line, i) => {
                shapeContext.fillText(line, shapeCanvas.width / 2, startY + i * lineHeight);
            });

            return processCanvas();
        },
        rectangle: function (w, h) {
            var dots = [],
                width = gap * w,
                height = gap * h;
            for (var y = 0; y < height; y += gap) {
                for (var x = 0; x < width; x += gap) {
                    dots.push(new S.Point({
                        x: x,
                        y: y
                    }));
                }
            }
            return { dots: dots, w: width, h: height };
        }
    };
}());
S.Shape = (function () {
    var dots = [],
        width = 0,
        height = 0,
        cx = 0,
        cy = 0;
    function compensate() {
        var a = S.Drawing.getArea();
        cx = a.w / 2 - width / 2;
        cy = a.h / 2 - height / 2;
    }
    return {
        shuffleIdle: function () {
            var a = S.Drawing.getArea();
            for (var d = 0; d < dots.length; d++) {
                if (!dots[d].s) {
                    dots[d].move({
                        x: Math.random() * a.w,
                        y: Math.random() * a.h
                    });
                }
            }
        },
        switchShape: function (n, fast) {
            var size,
                a = S.Drawing.getArea();
            width = n.w;
            height = n.h;
            compensate();
            if (n.dots.length > dots.length) {
                size = n.dots.length - dots.length;
                for (var d = 1; d <= size; d++) {
                    dots.push(new S.Dot(a.w / 2, a.h / 2));
                }
            }
            var d = 0,
                i = 0;
            while (n.dots.length > 0) {
                i = Math.floor(Math.random() * n.dots.length);
                dots[d].e = fast ? 0.25 : (dots[d].s ? 0.14 : 0.11);
                if (dots[d].s) {
                    dots[d].move(new S.Point({
                        z: Math.random() * 20 + 10,
                        a: Math.random(),
                        h: 18
                    }));
                } else {
                    dots[d].move(new S.Point({
                        z: Math.random() * 5 + 5,
                        h: fast ? 18 : 30
                    }));
                }
                dots[d].s = true;
                dots[d].move(new S.Point({
                    x: n.dots[i].x + cx,
                    y: n.dots[i].y + cy,
                    a: 1,
                    z: window.innerWidth < MOBILE_BREAKPOINT ? 3 : 5,
                    h: 0
                }));
                n.dots = n.dots.slice(0, i).concat(n.dots.slice(i + 1));
                d++;
            }
            for (var i = d; i < dots.length; i++) {
                if (dots[i].s) {
                    dots[i].move(new S.Point({
                        z: Math.random() * 20 + 10,
                        a: Math.random(),
                        h: 20
                    }));
                    dots[i].s = false;
                    dots[i].e = 0.04;
                    dots[i].move(new S.Point({
                        x: Math.random() * a.w,
                        y: Math.random() * a.h,
                        a: 0.3, //.4
                        z: Math.random() * 4,
                        h: 0
                    }));
                }
            }
        },
        render: function () {
            for (var d = 0; d < dots.length; d++) {
                dots[d].render();
            }
        }
    };
}());

// ----------------- Hiệu ứng máy bay thương mại -----------------
let planes = [];
let lastPlaneSpawnTime = 0;
let nextPlaneInterval = 0;
const PLANE_MIN_INTERVAL = 6000;  // ms
const PLANE_MAX_INTERVAL = 12000; // ms
const PLANE_FIRST_DELAY = 2500;   // máy bay đầu tiên sau 2.5 giây
const PLANE_MAX_COUNT = 2;        // tối đa 2 máy bay trên màn hình

function getRandomPlaneInterval() {
    return PLANE_MIN_INTERVAL + Math.random() * (PLANE_MAX_INTERVAL - PLANE_MIN_INTERVAL);
}

function spawnPlane() {
    const area = S.Drawing.getArea();
    const fromLeft = Math.random() < 0.5;
    const isMobile = area.w < PLANE_MOBILE_BREAKPOINT;
    const planeWidth = area.w * (isMobile
        ? 0.055 + Math.random() * 0.03
        : 0.025 + Math.random() * 0.02);
    const planeHeight = planeWidth * 0.22;
    const y = area.h * 0.15 + Math.random() * area.h * 0.4;
    const speed = 0.8 + Math.random() * 1.2;

    // Mỗi máy bay một màu khác nhau, hơi trong suốt
    const hue = Math.floor(Math.random() * 360);
    const sat = 55 + Math.random() * 35;
    const light = 50 + Math.random() * 25;
    const colorAlpha = 0.65 + Math.random() * 0.2;
    const bodyColor = `hsla(${hue}, ${sat}%, ${light}%, ${colorAlpha})`;
    const tailHue = (hue + 30 + (Math.random() * 40 - 20)) % 360;
    const tailColor = `hsla(${tailHue}, ${sat}%, 40%, ${colorAlpha * 0.9})`;

    const base = {
        x: fromLeft ? -planeWidth - 40 : area.w + planeWidth + 40,
        y,
        width: planeWidth,
        height: planeHeight,
        speed: fromLeft ? speed : -speed,
        bodyColor,
        tailColor,
        alpha: 0.5 + Math.random() * 0.2
    };

    planes.push(base);
}

function drawPlaneShape(ctx, plane) {
    ctx.save();
    try {
        const { x, y, width, height, speed, bodyColor, tailColor } = plane;
        const bodyLength = width * 0.8;
        const noseLength = width * 0.22;
        const bodyLeft = -bodyLength / 2;
        const bodyTop = -height / 2;

        ctx.translate(x, y);
        if (speed < 0) ctx.scale(-1, 1);
        ctx.globalAlpha = plane.alpha != null ? plane.alpha : 0.5;

        // Trái→phải: hơi chúc lên; phải→trái: mũi chếch lên trời như lúc cất cánh
        const tilt = speed > 0 ? -Math.PI / 20 : -Math.PI / 14;
        ctx.rotate(tilt);

        // Vệt khói (contrail) – trắng mờ, tan dần phía sau
        const trailLen = width * 1.2;
        const trailGrad = ctx.createLinearGradient(bodyLeft, 0, bodyLeft - trailLen, 0);
        trailGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
        trailGrad.addColorStop(0.3, 'rgba(255,255,255,0.18)');
        trailGrad.addColorStop(0.7, 'rgba(255,255,255,0.06)');
        trailGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.moveTo(bodyLeft, height * 0.08);
        ctx.lineTo(bodyLeft - trailLen, height * 0.2);
        ctx.lineTo(bodyLeft - trailLen, -height * 0.1);
        ctx.lineTo(bodyLeft, -height * 0.05);
        ctx.closePath();
        ctx.fill();

        // Thân màu theo máy bay, gradient nhẹ, hơi trong suốt
        const gradient = ctx.createLinearGradient(0, bodyTop, 0, bodyTop + height);
        gradient.addColorStop(0, 'rgba(255,255,255,0.75)');
        gradient.addColorStop(0.4, bodyColor || 'hsla(200, 50%, 70%, 0.7)');
        gradient.addColorStop(1, 'rgba(180,185,195,0.7)');

        // Thân + mũi một khối liền (không đứt đoạn)
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(bodyLeft, bodyTop + height / 2);
        ctx.lineTo(bodyLeft, bodyTop + height);
        ctx.lineTo(bodyLength / 2, bodyTop + height);
        ctx.quadraticCurveTo(bodyLength / 2 + noseLength, 0, bodyLength / 2, bodyTop);
        ctx.lineTo(bodyLeft, bodyTop);
        ctx.closePath();
        ctx.fill();

        // Ánh sáng phản chiếu trên thân (vệt sáng kim loại dọc sống máy bay)
        const reflY = bodyTop + height * 0.22;
        const reflGrad = ctx.createLinearGradient(bodyLeft, 0, bodyLength / 2, 0);
        reflGrad.addColorStop(0, 'rgba(255,255,255,0)');
        reflGrad.addColorStop(0.35, 'rgba(255,255,255,0.25)');
        reflGrad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
        reflGrad.addColorStop(0.65, 'rgba(255,255,255,0.2)');
        reflGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = reflGrad;
        ctx.beginPath();
        ctx.moveTo(bodyLeft + width * 0.1, reflY);
        ctx.lineTo(bodyLeft + bodyLength * 0.4, reflY - height * 0.08);
        ctx.lineTo(bodyLength / 2 - width * 0.08, reflY - height * 0.06);
        ctx.lineTo(bodyLeft + bodyLength * 0.4, reflY + height * 0.06);
        ctx.closePath();
        ctx.fill();

        // Cánh chính (tông nhạt, hơi trong suốt)
        ctx.fillStyle = 'rgba(248,250,255,0.55)';
        ctx.strokeStyle = 'rgba(200,205,215,0.6)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-width * 0.08, height * 0.08);
        ctx.lineTo(-width * 0.5, -height * 0.15);
        ctx.lineTo(-width * 0.48, -height * 0.5);
        ctx.lineTo(-width * 0.42, -height * 0.55);
        ctx.lineTo(width * 0.12, -height * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Winglet (đầu cánh cong lên)
        ctx.beginPath();
        ctx.moveTo(-width * 0.5, -height * 0.15);
        ctx.quadraticCurveTo(-width * 0.55, -height * 0.35, -width * 0.48, -height * 0.5);
        ctx.stroke();

        // Đuôi đứng (vertical tail) – màu mỗi máy bay, hơi trong suốt
        const tailX = bodyLeft - width * 0.02;
        ctx.fillStyle = tailColor || 'hsla(210, 75%, 45%, 0.75)';
        ctx.beginPath();
        ctx.moveTo(tailX + width * 0.08, -height * 0.15);
        ctx.lineTo(tailX - width * 0.1, -height * 0.85);
        ctx.lineTo(tailX, -height * 0.75);
        ctx.lineTo(tailX + width * 0.12, -height * 0.2);
        ctx.closePath();
        ctx.fill();

        // Cánh đuôi ngang (horizontal stabilizer)
        ctx.fillStyle = 'rgba(242,244,250,0.55)';
        ctx.beginPath();
        ctx.moveTo(tailX, -height * 0.12);
        ctx.lineTo(tailX - width * 0.28, -height * 0.4);
        ctx.lineTo(tailX + width * 0.25, -height * 0.35);
        ctx.closePath();
        ctx.fill();

        // Hai động cơ dưới cánh (xám)
        const engY = height * 0.32;
        ctx.fillStyle = 'rgba(140,145,155,0.95)';
        ctx.beginPath();
        ctx.arc(-width * 0.28, engY, height * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-width * 0.02, engY, height * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Cửa sổ hành khách (chấm tối nhỏ)
        const windowCount = width > 12 ? 6 : 4;
        const step = (bodyLength * 0.7) / (windowCount + 1);
        ctx.fillStyle = 'rgba(80,90,110,0.85)';
        const windowY = -height * 0.02;
        const windowR = Math.max(0.4, height * 0.06);
        for (let i = 1; i <= windowCount; i++) {
            const wx = bodyLeft + width * 0.08 + step * i;
            ctx.beginPath();
            ctx.arc(wx, windowY, windowR, 0, Math.PI * 2);
            ctx.fill();
        }

    } catch (e) { /* tránh lỗi vẽ làm hỏng canvas */ }
    ctx.restore();
}

function renderPlanes() {
    const ctx = S.Drawing.getContext && S.Drawing.getContext();
    if (!ctx) return;

    const now = performance.now();
    if (!lastPlaneSpawnTime) {
        lastPlaneSpawnTime = now;
        nextPlaneInterval = PLANE_FIRST_DELAY;
    }

    if (planes.length < PLANE_MAX_COUNT && now - lastPlaneSpawnTime >= nextPlaneInterval) {
        spawnPlane();
        lastPlaneSpawnTime = now;
        nextPlaneInterval = getRandomPlaneInterval();
    }

    const area = S.Drawing.getArea();
    for (let i = planes.length - 1; i >= 0; i--) {
        const p = planes[i];
        p.x += p.speed;

        // Xóa máy bay khi ra khỏi màn hình
        if (p.x < -area.w - 200 || p.x > area.w + 200) {
            planes.splice(i, 1);
            continue;
        }

        drawPlaneShape(ctx, p);
    }
}
let effectsStarted = false;

const textCanvas = document.querySelector(".canvas");

function tryStartEffects() {
    textCanvas.style.display = "block";

    if (!effectsStarted) {
        effectsStarted = true;
        S.init();
        resizeCanvas();
        if (window.startFireworks) window.startFireworks();
    }
}

window.addEventListener("load", tryStartEffects);
window.addEventListener("resize", tryStartEffects);
window.addEventListener("orientationchange", tryStartEffects);

const sound = document.getElementById('sound');

function playSound() {
    if (!sound) return;

    const startPlay = () => {
        sound.play().then(() => {
            console.log("Music started playing");
        }).catch((e) => {
            console.warn('Phát nhạc bị chặn hoặc lỗi:', e);
        });
    };

    if (sound.paused) {
        // Một số trình duyệt yêu cầu set currentTime trước hoặc sau khi play
        if (sound.currentTime < 22) sound.currentTime = 22;
        startPlay();
    } else if (sound.muted) {
        sound.muted = false;
        startPlay();
    }
}

function resizeCanvas() {
    // Chỉ resize canvas chữ chính
    const canvas = document.querySelector('.canvas');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

resizeCanvas();
window.addEventListener('resize', debounce(resizeCanvas, 120));

