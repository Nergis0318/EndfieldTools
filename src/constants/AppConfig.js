const BASE_URL = import.meta.env.BASE_URL;

export const APP_CONFIG = {
    STORAGE_KEYS: {
        WEAPON_STATUS: 'endfield_weapon_status_v2', // 기질 보유 현황
        TODO_DATA: 'endfield_todo_v4_unified',      // 숙제 데이터 (통합됨)
        TODO_MODE: 'endfield_todo_mode'             // 간편/상세 모드
    },
    PATHS: {
        DATA: `${BASE_URL}data/data.json`,
        LOCATIONS: `${BASE_URL}data/locations.json`,
        TASKS: `${BASE_URL}data/tasks.json`,
        CONFIG: `${BASE_URL}data/config.json`,
        WEAPON_IMAGES: `${BASE_URL}assets/images/weapons`
    },
    RESET_HOUR: 5, // 오전 5시 리셋
    CATEGORIES: {
        STATS: ["민첩 증가", "힘 증가", "의지 증가", "지능 증가", "주요 능력치 증가", "체력 증가", "방어력 증가"],
        SERIES: ["강공", "억제", "추격", "분쇄", "사기", "기예", "잔혹", "고통", "의료", "골절", "방출", "어둠", "흐름", "효율"]
    }
};
