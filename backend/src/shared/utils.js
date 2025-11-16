/**
 * 문자열을 받아서 URL 친화적인 슬러그로 변환합니다.
 * (소문자, 숫자, 하이픈만 포함하도록)
 * @param {string} text
 * @returns {string}
 */
exports.generateSlug = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')       // 공백을 하이픈으로 치환
        .replace(/[^a-z0-9-]/g, '') // 영문, 숫자, 하이픈 외 제거
        .replace(/--+/g, '-');      // 연속된 하이픈을 하나로 치환
};

// 필요한 다른 유틸리티 함수들을 여기에 추가할 수 있습니다.