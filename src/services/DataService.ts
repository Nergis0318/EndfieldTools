// src/services/DataService.ts
import { APP_CONFIG } from "../constants/AppConfig.ts";

export class DataService {
  /**
   * JSON 데이터를 로드합니다.
   * @param {string} path - JSON 파일 경로
   * @returns {Promise<any>} 파싱된 데이터
   */
  static async fetchJson(path: string): Promise<any> {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      return await response.json();
    } catch (error) {
      console.error(`[DataService] Fetch Error:`, error);
      throw error;
    }
  }

  // 각각의 데이터를 불러오는 헬퍼 메서드들
  static async loadWeapons() {
    // 무기 데이터와 위치 데이터를 병렬로 로드하여 병합
    const [weapons, locations] = await Promise.all([
      this.fetchJson(APP_CONFIG.PATHS.DATA),
      this.fetchJson(APP_CONFIG.PATHS.LOCATIONS).catch(() => null), // locations 없어도 동작하도록
    ]);

    if (!locations) return weapons;

    // 위치 정보 매핑 (Location Mapping Logic)
    return weapons.map((w) => {
      const dropLocations = locations
        .filter(
          (loc) =>
            w.tags && w.tags.every((tag) => loc.available_tags.includes(tag)),
        )
        .map((loc) => loc.name);

      return {
        ...w,
        location:
          dropLocations.length > 0 ? dropLocations.join(", ") : "정보 없음",
      };
    });
  }

  static async loadTasks() {
    return await this.fetchJson(APP_CONFIG.PATHS.TASKS);
  }

  static async loadConfig() {
    return await this.fetchJson(APP_CONFIG.PATHS.CONFIG);
  }
}
