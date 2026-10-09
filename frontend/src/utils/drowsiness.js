// Helper to calculate distance between two landmarks
function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Analyzes FaceMesh landmarks to detect drowsiness signs.
 * @param {Array} lm - The landmarks array from MediaPipe FaceMesh
 * @returns {Object} - { eyeClosed, isYawning, headOff }
 */
export function analyzeDrowsiness(lm) {
    if (!lm) return { eyeClosed: false, isYawning: false, headOff: false, faceMissing: true };

    /* -------- EYE RATIO (ROBUST) -------- */
    // Landmarks: 159 (top), 145 (bottom), 33 (left), 133 (right)
    const eyeOpen = dist(lm[159], lm[145]) / dist(lm[33], lm[133]);
    const eyeClosed = eyeOpen < 0.18;

    /* -------- MOUTH RATIO -------- */
    // Landmarks: 13 (top lip), 14 (bottom lip), 78 (left corner), 308 (right corner)
    const mouthOpen = dist(lm[13], lm[14]) / dist(lm[78], lm[308]);
    const isYawning = mouthOpen > 0.35;

    /* -------- HEAD POSE -------- */
    // 33 (left eye outer) 263 (right eye outer) -> Center X/Y
    const cx = (lm[33].x + lm[263].x) / 2;
    const cy = (lm[33].y + lm[263].y) / 2;
    // 1 (Nose tip)
    const dx = lm[1].x - cx;
    const dy = lm[1].y - cy;

    const headOff = Math.abs(dx) > 0.10 || Math.abs(dy) > 0.10;

    return {
        eyeClosed,
        isYawning,
        headOff,
        faceMissing: false
    };
}
