export interface CountdownDate {
    name: string;
    date: string;
}

export interface CountdownConfig {
    title: string;
    max_dates: number;
    dates: CountdownDate[];
}

function isDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeConfig(value: any): CountdownConfig {
    const dates = Array.isArray(value?.dates) ? value.dates : [];
    const limit = Number(value?.max_dates);
    return {
        title: typeof value?.title === 'string' && value.title.trim() ? value.title.trim() : '比赛倒计时',
        max_dates: Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : 3,
        dates: dates.map((entry) => ({
            name: entry?.name,
            date: entry?.date instanceof Date && Number.isFinite(entry.date.getTime())
                ? entry.date.toISOString().slice(0, 10) : entry?.date,
        })).filter((entry) => typeof entry.name === 'string' && isDate(entry.date)),
    };
}

export function validateConfig(value: any): CountdownConfig {
    if (typeof value?.title !== 'string' || !value.title.trim() || value.title.trim().length > 100) {
        throw new Error('请填写倒计时标题，最多 100 个字符。');
    }
    const limit = Number(value.max_dates);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('首页显示数量须为 1–100 之间的整数。');
    if (!Array.isArray(value.dates)) throw new Error('倒计时数据无效，请刷新页面后重试。');
    if (value.dates.length > 500) throw new Error('最多可保存 500 条倒计时。');
    const dates = value.dates.map((entry, index) => {
        if (typeof entry?.name !== 'string' || !entry.name.trim() || entry.name.trim().length > 100) {
            throw new Error(`第 ${index + 1} 条倒计时需要填写名称，最多 100 个字符。`);
        }
        if (!isDate(entry.date)) throw new Error(`第 ${index + 1} 条倒计时的日期无效，请填写 YYYY-MM-DD 格式的有效日期。`);
        return { name: entry.name.trim(), date: entry.date };
    });
    const unique = new Map<string, CountdownDate>();
    for (const entry of dates) {
        const key = JSON.stringify([entry.name, entry.date]);
        unique.set(key, entry);
    }
    return { title: value.title.trim(), max_dates: limit, dates: [...unique.values()] };
}

export function getBeijingDate(now = new Date()) {
    return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function buildCountdown(config: CountdownConfig, now = new Date()) {
    const today = getBeijingDate(now);
    return {
        title: config.title,
        dates: config.dates.filter((entry) => entry.date >= today)
            .slice().sort((left, right) => left.date.localeCompare(right.date)).slice(0, config.max_dates)
            .map(({ name, date }) => ({ name, date, diff: (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000 })),
    };
}
