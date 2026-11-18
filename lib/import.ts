import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { dump, JSON_SCHEMA, load } from 'js-yaml';
import { CountdownDate, getBeijingDate } from './countdown';

export function parseDatesText(value: unknown): unknown[] {
    if (typeof value !== 'string') throw new Error('请粘贴倒计时文本后保存。');
    if (Buffer.byteLength(value, 'utf8') > 512 * 1024) throw new Error('倒计时文本过长，请控制在 512 KiB 以内。');
    let text = value.trim();
    let inFence = false;
    text = text.split(/\r?\n/).map((line) => {
        if (!/^```(?:ya?ml|json)?[ \t]*$/i.test(line)) return line;
        inFence = !inFence;
        return '';
    }).join('\n').trim();
    if (inFence) throw new Error('代码块标记没有成对闭合，请补全或移除单独一行的 ``` 标记。');
    if (!text || text.split('\n').every((line) => !line.trim() || line.trimStart().startsWith('#'))) return [];
    let data: any;
    try {
        data = load(text, { schema: JSON_SCHEMA });
    } catch (error) {
        const position = error.mark ? `（第 ${error.mark.line + 1} 行，第 ${error.mark.column + 1} 列）` : '';
        throw new Error(`倒计时文本格式错误${position}，请检查缩进、引号，或只粘贴 AI 返回的 YAML 代码块。`);
    }
    if (data === undefined) return [];
    if (Array.isArray(data)) return data;
    const dates = data?.countdown?.dates ?? data?.dates;
    if (Array.isArray(dates)) return dates;
    throw new Error('请使用页面示例中的 YAML 列表格式，每条倒计时填写 name 和 date。');
}

export function formatDatesText(dates: CountdownDate[]) {
    return dates.length ? dump(dates, {
        schema: JSON_SCHEMA, lineWidth: -1, forceQuotes: true, noRefs: true,
    }) : '';
}

export async function buildImportPrompt() {
    const prompt = await readFile(path.join(__dirname, '..', 'prompt.txt'), 'utf8');
    return prompt.replaceAll('{{today}}', getBeijingDate()).trimEnd();
}
