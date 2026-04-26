const { createCanvas } = require('canvas');

/**
 * Procedurally generates a clean, modern canvas book cover.
 * 
 * @param {string} title - Book Title
 * @param {string} author - Book Author
 * @returns {Promise<string>} Base64 data URI of the generated PNG
 */

function getGradientColors(title) {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate an HSL color based on the hash for visually distinct but appealing colors
    const h1 = Math.abs(hash) % 360;
    const h2 = (h1 + 40) % 360; // Analogous color for a smooth gradient
    
    return [
        `hsl(${h1}, 70%, 40%)`,
        `hsl(${h2}, 80%, 15%)`
    ];
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    for (let n = 0; n < words.length; n++) {
        let testLine = currentLine + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(currentLine.trim());
            currentLine = words[n] + ' ';
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        lines.push(currentLine.trim());
    }
    return lines.slice(0, 4); // Max 4 lines
}

async function generateCover(title, author) {
    const width = 300;
    const height = 450;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const safeTitle = title || "Unknown Title";
    const safeAuthor = author || "Unknown Author";

    const [color1, color2] = getGradientColors(safeTitle);

    // 1. Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Abstract Pattern (low opacity)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.15, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width * 0.15, height * 0.85, 160, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Title (Centered, Bold, Wrapped)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const maxTextWidth = 260;
    const titleLines = wrapText(ctx, safeTitle, maxTextWidth);
    
    const lineHeight = 40;
    const totalTextHeight = titleLines.length * lineHeight;
    let startY = (height / 2) - (totalTextHeight / 2) - 20; // Slightly above center

    // Drop shadow for title
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    titleLines.forEach((line, index) => {
        ctx.fillText(line, width / 2, startY + (index * lineHeight));
    });

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Decorative line
    const lineY = startY + (titleLines.length * lineHeight) + 20;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.moveTo(width / 2 - 40, lineY);
    ctx.lineTo(width / 2 + 40, lineY);
    ctx.stroke();

    // 4. Author (Smaller below)
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(safeAuthor.toUpperCase(), width / 2, lineY + 40);

    // Return as Base64 Data URI
    return canvas.toDataURL('image/png');
}

module.exports = {
    generateCover
};
