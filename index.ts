import { JSON_SCHEMA, load } from 'js-yaml';
import { Context, Handler, PERM, PermissionError, PRIV, SystemModel } from 'hydrooj';
import { buildCountdown, CountdownConfig, normalizeConfig, validateConfig } from './lib/countdown';
import { buildImportPrompt, formatDatesText, parseDatesText } from './lib/import';

const CONFIG_KEY = 'countdown.config';

function canManageCountdown(handler: Handler) {
    return handler.user.hasPriv(PRIV.PRIV_EDIT_SYSTEM)
        || (handler.domain._id === 'system' && handler.user.hasPerm(PERM.PERM_EDIT_DOMAIN));
}

function readConfig(homepage: string): CountdownConfig {
    const saved = SystemModel.get(CONFIG_KEY);
    if (saved) return normalizeConfig(saved);
    try {
        const columns = load(homepage || '', { schema: JSON_SCHEMA });
        if (Array.isArray(columns)) {
            const column = columns.find((item) => item && typeof item === 'object' && 'countdown' in item);
            if (column) return normalizeConfig(column.countdown);
        }
    } catch {
        // An invalid homepage layout must not prevent opening the configuration page.
    }
    return normalizeConfig({});
}

class CountdownHandler extends Handler {
    async prepare() {
        this.checkPriv(PRIV.PRIV_USER_PROFILE);
        if (!canManageCountdown(this)) throw new PermissionError(PERM.PERM_EDIT_DOMAIN);
    }

    async get() {
        const config = readConfig(this.ctx.setting.get('hydrooj.homepage'));
        this.response.addHeader('Cache-Control', 'private, no-store');
        this.response.template = 'countdown_manage.html';
        this.response.body = {
            config,
            datesText: formatDatesText(config.dates),
            importPrompt: await buildImportPrompt(),
        };
    }

    async post() {
        const { title, max_dates: maxDates, dates } = this.request.body;
        let config: CountdownConfig;
        try {
            config = validateConfig({ title, max_dates: maxDates, dates: parseDatesText(dates) });
        } catch (error) {
            this.response.status = 400;
            this.response.template = 'countdown_manage.html';
            this.response.body = {
                config: {
                    title: typeof title === 'string' ? title : '',
                    max_dates: typeof maxDates === 'string' ? maxDates : 3,
                    dates: [],
                },
                datesText: typeof dates === 'string' ? dates : '',
                importPrompt: await buildImportPrompt(),
                error: error.message,
            };
            return;
        }
        await SystemModel.set(CONFIG_KEY, config);
        this.response.redirect = this.url('homepage');
    }
}

export const name = 'hydrooj-countdown-plus';

export function apply(ctx: Context) {
    ctx.Route('countdown', '/countdown', CountdownHandler, PRIV.PRIV_USER_PROFILE);
    ctx.injectUI('ControlPanel', 'countdown', { icon: 'time' }, canManageCountdown);
    ctx.injectUI('DomainManage', 'countdown', { icon: 'time', family: 'Properties' }, canManageCountdown);
    ctx.i18n.load('zh', { countdown: '倒计时管理' });
    ctx.i18n.load('en', { countdown: 'Countdown' });

    ctx.on('handler/before/Home#get', (handler) => {
        Object.assign(handler, {
            getCountdown: async (_domainId: string, payload: unknown) =>
                buildCountdown(normalizeConfig(SystemModel.get(CONFIG_KEY) || payload)),
        });
    });
    ctx.on('handler/after/Home#get', (handler) => {
        const saved = SystemModel.get(CONFIG_KEY);
        const contents = handler.response.body?.contents;
        if (!saved || !Array.isArray(contents)) return;
        if (contents.some((column) => column.sections?.some(([section]) => section === 'countdown'))) return;
        const section = ['countdown', buildCountdown(normalizeConfig(saved))];
        if (contents.length) contents[contents.length - 1].sections.push(section);
        else contents.push({ width: 12, sections: [section] });
    });
}
