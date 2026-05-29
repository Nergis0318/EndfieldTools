// src/main-todo.js
import Sortable from "sortablejs";
import { APP_CONFIG } from "./constants/AppConfig.js";
import { StorageUtils } from "./utils/StorageUtils.js";
import { DateUtils } from "./utils/CommonUtils.js";
import { DataService } from "./services/DataService.js";
import { TaskLogic } from "./domain/TaskLogic.js";
import { TaskRenderer } from "./ui/TaskRenderer.js";

class TodoApp {
  constructor() {
    this.tasks = [];
    this.renderer = new TaskRenderer();
    this.sortable = null; // Sortable 인스턴스 저장용

    const savedState = StorageUtils.load(APP_CONFIG.STORAGE_KEYS.TODO_DATA, {});
    this.state = {
      lastLogin: Date.now(),
      completed: {},
      subStatus: {},
      order: { daily: [], weekly: [] }, // 정렬 순서 (오브젝트 구조)
      hiddenTasks: {},
      hideCompleted: false,
      mode: "simple",
      ...savedState,
    };

    this.currentTab = "daily";
    this.init();
  }

  async init() {
    try {
      const rawTasks = await DataService.loadTasks();
      const config = await DataService.loadConfig();

      // 데이터 전처리
      this.tasks = rawTasks.map((t) => {
        let subs = [];

        // 1. "steps" 배열이 있는 경우 (새로운 방식)
        if (Array.isArray(t.steps) && t.steps.length > 0) {
          subs = t.steps.map((stepTitle, i) => ({
            id: `${t.id}-sub-${i}`, // 고유 ID 생성 규칙 유지
            title: stepTitle,
          }));
        }
        // 2. 기존 "subtasks" 필드가 이미 있는 경우 (혹시 모를 대비)
        else if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
          subs = t.subtasks;
        }
        // 3. 기존 방식: desc에 '/'가 있는 경우 (하위 호환성)
        else if (t.desc && t.desc.includes("/")) {
          subs = t.desc.split("/").map((s, i) => ({
            id: `${t.id}-sub-${i}`,
            title: s.trim(),
          }));
        }
        // 4. 서브 태스크가 없고 desc만 있는 경우 -> 서브 태스크 1개로 취급할지 여부는 선택
        // (여기서는 desc는 설명으로만 쓰고, steps가 없으면 서브태스크 없는 것으로 처리)
        // 만약 desc를 서브태스크 1개로 만들고 싶다면 아래 주석 해제
        else if (t.desc) {
          subs = [{ id: `${t.id}-sub-0`, title: t.desc }];
        }

        return { ...t, subtasks: subs };
      });

      // 첫 실행 시 Config의 기본 정렬/숨김 적용
      if (!this.state.order.daily || this.state.order.daily.length === 0) {
        this.state.order = config.order || { daily: [], weekly: [] };
        this.state.hiddenTasks = {
          ...(config.hiddenTasks || {}),
          ...this.state.hiddenTasks,
        };
        this.saveState();
      }
    } catch (error) {
      console.error("Initialization failed:", error);
    }

    this.checkReset();
    this.render();
    this.initEventListeners();

    document.getElementById("current-date").innerText =
      DateUtils.getDisplayDate();
  }

  render() {
    const filteredTasks = TaskLogic.processTasks(
      this.tasks,
      this.state,
      this.currentTab,
    );
    const progress = TaskLogic.calculateProgress(
      this.tasks,
      this.state,
      this.currentTab,
    );

    this.renderer.render(filteredTasks, this.state, this.state.mode);
    this.renderer.updateProgress(progress);
    this.renderer.updateToggleBtn(this.state.hideCompleted);

    // [중요] 렌더링 후 드래그 기능 재연결
    this.initSortable();
  }

  // 드래그 앤 드롭 초기화
  initSortable() {
    const el = document.getElementById("task-list");
    if (this.sortable) this.sortable.destroy();

    this.sortable = new Sortable(el, {
      group: "tasks",
      handle: ".drag-handle", // 핸들 지정 필수
      animation: 200,
      ghostClass: "sortable-ghost",
      forceFallback: true, // 스타일 유지를 위해 켜둠 (touch-pan-y와 함께 사용시 문제 없음)
      touchStartThreshold: 5, // [추가] 5px 이상 움직여야 드래그로 인식 (스크롤 오작동 방지)
      fallbackClass: "sortable-fallback",
      onStart: () =>
        document.getElementById("trash-zone").classList.add("active"),
      onEnd: () => {
        document.getElementById("trash-zone").classList.remove("active");
        this.saveOrder();
      },
    });
  }

  saveOrder() {
    const items = document.querySelectorAll(".task-item");
    const newOrder = Array.from(items).map((i) => i.dataset.id);

    // 현재 탭의 순서 업데이트
    this.state.order[this.currentTab] = newOrder;
    this.saveState(); // 저장 후 render 호출됨 -> 헤더 위치 자동 갱신
  }

  saveState() {
    StorageUtils.save(APP_CONFIG.STORAGE_KEYS.TODO_DATA, this.state);
    this.render();
  }

  checkReset() {
    const now = new Date();
    const last = new Date(this.state.lastLogin);

    if (
      DateUtils.getGameDateString(now) !== DateUtils.getGameDateString(last)
    ) {
      console.log("🔄 일일 숙제 리셋");
      this.state.completed = {};
      this.state.subStatus = {};
    }
    this.state.lastLogin = now.getTime();
    StorageUtils.save(APP_CONFIG.STORAGE_KEYS.TODO_DATA, this.state);
  }

  // --- User Actions ---

  toggleMainTask(id) {
    this.state = TaskLogic.toggleMain(id, this.tasks, this.state);
    this.saveState();
  }

  toggleSubTask(parentId, subId) {
    this.state = TaskLogic.toggleSub(parentId, subId, this.tasks, this.state);
    this.saveState();
  }

  toggleViewMode() {
    this.state.mode = this.state.mode === "simple" ? "detail" : "simple";
    const btn = document.getElementById("mode-switch-btn");
    const labels = document.querySelectorAll(".mode-label");

    if (this.state.mode === "detail") {
      btn.classList.add("mode-detail");
      labels[0].classList.remove("active");
      labels[1].classList.add("active");
    } else {
      btn.classList.remove("mode-detail");
      labels[0].classList.add("active");
      labels[1].classList.remove("active");
    }
    this.saveState();
  }

  toggleHideCompleted() {
    this.state.hideCompleted = !this.state.hideCompleted;
    this.saveState();
  }

  // --- Trash & Hidden ---

  initEventListeners() {
    const trashEl = document.getElementById("trash-zone");
    new Sortable(trashEl, {
      group: "tasks",
      ghostClass: "hidden",
      onAdd: (evt) => {
        trashEl.classList.remove("active");
        const id = evt.item.dataset.id;
        this.state.hiddenTasks[id] = true;
        evt.item.remove();
        this.saveState();
      },
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.checkReset();
    });

    // 초기 UI 상태 동기화
    if (this.state.mode === "detail") {
      document.getElementById("mode-switch-btn").classList.add("mode-detail");
      document.querySelectorAll(".mode-label")[1].classList.add("active");
    } else {
      document.querySelectorAll(".mode-label")[0].classList.add("active");
    }
  }

  openHiddenManager() {
    const modal = document.getElementById("hidden-modal-backdrop");
    const list = document.getElementById("hidden-list");
    const hiddenItems = this.tasks.filter((t) => this.state.hiddenTasks[t.id]);

    if (hiddenItems.length === 0) {
      list.innerHTML = `<div class="text-center text-slate-500 py-8 text-sm">제외된 항목이 없습니다.</div>`;
    } else {
      list.innerHTML = hiddenItems
        .map(
          (task) => `
                <div class="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <span class="text-slate-200 font-bold text-sm truncate mr-4">${task.title}</span>
                    <button onclick="window.app.restoreTask('${task.id}')" class="text-xs font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-900/20 px-3 py-1.5 rounded-lg hover:bg-emerald-900/50 whitespace-nowrap">복구</button>
                </div>
            `,
        )
        .join("");
    }
    modal.classList.remove("hidden");
  }

  closeHiddenManager() {
    document.getElementById("hidden-modal-backdrop").classList.add("hidden");
  }

  restoreTask(id) {
    delete this.state.hiddenTasks[id];
    this.saveState();
    this.openHiddenManager();
  }

  forceReset() {
    if (!confirm("완료 기록을 초기화하시겠습니까?")) return;
    this.state.completed = {};
    this.state.subStatus = {};
    this.saveState();
  }

  resetOrder() {
    if (!confirm("순서를 기본값으로 되돌리겠습니까?")) return;
    this.state.order = { daily: [], weekly: [] };
    this.saveState();
  }
}

window.app = new TodoApp();
