import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { LinkedinForm } from "./LinkedinForm";
import { saveLinkedinProfile } from "@/app/audit/admin/profile-actions";
const state = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  edit: {} as Record<string, () => void>,
  menus: [] as { open: boolean }[],
  submit: undefined as undefined | ((form: FormData) => Promise<unknown>),
}));
const record = vi.hoisted(
  () => (type: unknown, props: Record<string, unknown>) => {
    if (
      type === "button" &&
      typeof props.children === "string" &&
      ["Edit link", "Wrong person, change link"].includes(props.children)
    )
      state.edit[props.children] = props.onClick as () => void;
    if (type === "details" && props.className === "sc-admin-link-menu") {
      const ref = props.ref as { current: { open: boolean } | null };
      if (!ref.current) ref.current = { open: true };
      state.menus.push(ref.current);
    }
    if (type === "form" && props.className === "sc-admin-inline-edit")
      state.submit = props.action as (form: FormData) => Promise<unknown>;
  }
);
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  const useState = (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [
      state.values[index],
      (next: unknown) => {
        state.values[index] = next;
      },
    ] as const;
  };
  return {
    ...react,
    useState,
    useRef: (initial: unknown) => {
      const index = state.cursor++;
      if (!(index in state.values)) state.values[index] = { current: initial };
      return state.values[index];
    },
    useEffect: () => {},
    useActionState: (
      action: (previous: unknown, form: FormData) => Promise<unknown>,
      initial: unknown
    ) => {
      const [previous, setPrevious] = useState(initial);
      return [
        previous,
        async (form: FormData) => {
          const result = await action(previous, form);
          setPrevious(result);
          return result;
        },
        false,
      ];
    },
  };
});
// Observe the rendered intrinsic elements, retaining actual React context and
// invoking the component's real event handlers and action wrapper.
vi.mock("react/jsx-runtime", async (original) => {
  const runtime = await original<typeof import("react/jsx-runtime")>();
  return {
    ...runtime,
    jsx: (
      type: Parameters<typeof runtime.jsx>[0],
      props: Record<string, unknown>,
      key?: string
    ) => {
      record(type, props);
      return runtime.jsx(type, props, key);
    },
    jsxs: (
      type: Parameters<typeof runtime.jsxs>[0],
      props: Record<string, unknown>,
      key?: string
    ) => {
      record(type, props);
      return runtime.jsxs(type, props, key);
    },
  };
});
vi.mock("react/jsx-dev-runtime", async (original) => {
  const runtime = await original<typeof import("react/jsx-dev-runtime")>();
  return {
    ...runtime,
    jsxDEV: (...args: Parameters<typeof runtime.jsxDEV>) => {
      record(args[0], args[1] as Record<string, unknown>);
      return runtime.jsxDEV(...args);
    },
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/audit/admin/profile-actions", () => ({
  saveLinkedinProfile: vi.fn(),
  lookupLinkedin: vi.fn(),
}));
beforeEach(() => {
  state.values = [];
  state.cursor = 0;
  state.edit = {};
  state.menus = [];
  state.submit = undefined;
  vi.clearAllMocks();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());
function render() {
  state.cursor = 0;
  state.menus = [];
  return renderToStaticMarkup(
    createElement(LinkedinForm, {
      leadPath: "/audit/admin/example",
      company: "Example",
      name: "Peter-Paul",
      profile: {
        lookupVersion: 3,
        companyLinkedin: null,
        linkedinProfile: null,
      },
    })
  );
}
it.each(["Edit link", "Wrong person, change link"])(
  "D3-D4 %s closes the input and menu on save; success expires at three seconds",
  async (edit) => {
    render();
    state.edit[edit]();
    expect(render()).toContain("Save link");
    const menu = state.menus[edit === "Edit link" ? 0 : 1];
    menu.open = true;
    vi.mocked(saveLinkedinProfile).mockResolvedValue({
      message: "LinkedIn link saved.",
    });
    await state.submit!(new FormData());
    expect(menu.open).toBe(false);
    const saved = render();
    expect(saved).not.toContain("Save link");
    expect(saved).toContain("LinkedIn link saved.");
    await vi.advanceTimersByTimeAsync(2999);
    expect(render()).toContain("LinkedIn link saved.");
    await vi.advanceTimersByTimeAsync(1);
    expect(render()).not.toContain("LinkedIn link saved.");
  }
);
it.each(["Edit link", "Wrong person, change link"])(
  "D3-D4 %s remains open on validation error and the error persists",
  async (edit) => {
    render();
    state.edit[edit]();
    render();
    vi.mocked(saveLinkedinProfile).mockResolvedValue({
      message: "Use a valid LinkedIn URL.",
      error: true,
    });
    await state.submit!(new FormData());
    await vi.advanceTimersByTimeAsync(4000);
    const failed = render();
    expect(failed).toContain("Save link");
    expect(failed).toContain("Use a valid LinkedIn URL.");
  }
);
it("D3 transport errors also keep the person input open", async () => {
  render();
  state.edit["Wrong person, change link"]();
  render();
  vi.mocked(saveLinkedinProfile).mockRejectedValue(
    new Error("connection failed")
  );
  await state.submit!(new FormData());
  const failed = render();
  expect(failed).toContain("Save link");
  expect(failed).toContain("LinkedIn link could not be saved.");
});
