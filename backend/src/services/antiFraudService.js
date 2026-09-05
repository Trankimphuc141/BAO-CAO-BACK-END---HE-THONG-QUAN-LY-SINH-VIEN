const crypto = require('crypto');

/**
 * Tính mã băm SHA-256 để kiểm tra trùng file 100%
 */
exports.calculateFileHash = (content) => {
    return crypto.createHash('sha-256').update(content).digest('hex');
};

/**
 * Thuật toán tách từ tiếng Việt / tiếng Anh và chuẩn hóa văn bản
 */
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s\u00C0-\u1EF9]/gi, ' ')
        .split(/\s+/)
        .filter(word => word.trim().length > 1);
}

/**
 * Thuật toán tạo N-Gram (k-shingles) cho văn bản
 */
function getNGrams(tokens, n = 3) {
    if (tokens.length < n) return new Set(tokens);
    const ngrams = new Set();
    for (let i = 0; i <= tokens.length - n; i++) {
        ngrams.add(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
}

/**
 * Thuật toán so khớp độ tương đồng văn bản Jaccard Index & N-Grams
 */
exports.calculateSimilarity = (textA, textB) => {
    if (!textA || !textB) return { similarity: 0, matchedTokens: [] };

    const tokensA = tokenize(textA);
    const tokensB = tokenize(textB);

    if (tokensA.length === 0 || tokensB.length === 0) {
        return { similarity: 0, matchedTokens: [] };
    }

    const ngramsA = getNGrams(tokensA, 2);
    const ngramsB = getNGrams(tokensB, 2);

    const intersection = new Set([...ngramsA].filter(x => ngramsB.has(x)));
    const union = new Set([...ngramsA, ...ngramsB]);

    if (union.size === 0) return { similarity: 0, matchedTokens: [] };

    const similarity = Number(((intersection.size / union.size) * 100).toFixed(2));
    const matchedTokens = Array.from(intersection).slice(0, 10); // Lấy tối đa 10 cụm từ trùng nổi bật

    return {
        similarity,
        matchedTokens
    };
};

/**
 * Đánh giá mức độ cảnh báo gian lận dựa trên % tương đồng và mã băm
 */
exports.evaluateFraudRisk = (similarityPercentage, isExactHashMatch) => {
    if (isExactHashMatch || similarityPercentage >= 80) {
        return 'Gian lận nghiêm trọng';
    } else if (similarityPercentage >= 45) {
        return 'Nghi vấn đạo văn';
    } else if (similarityPercentage >= 20) {
        return 'Cảnh báo nhẹ';
    }
    return 'An toàn';
};