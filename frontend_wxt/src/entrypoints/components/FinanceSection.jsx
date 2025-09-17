import { InformationCircleIcon } from "@heroicons/react/24/solid";
import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  toggleFinanceCategory,
  setFinancePreset,
  toggleFinanceSelection,
  setFinanceSearch,
  resetFinanceSelections,
  toggleAllFinanceSelections,
} from "@/entrypoints/store/financeSlice.js";
import {
  STOCK_PRESETS,
  STOCK_OPTIONS,
  CRYPTO_PRESETS,
  CRYPTO_OPTIONS,
} from "@/entrypoints/popup/tabs/data.tsx";

export function FinanceSection() {
  const dispatch = useDispatch();
  const financeState = useSelector((state) => state.finance);

  const getSelected = useCallback(
    (type) => {
      const settings = financeState[type];
      if (!settings?.customSelections) return [];
      return Object.keys(settings.customSelections).filter(
        (key) => settings.customSelections[key]
      );
    },
    [financeState]
  );

  const getFilteredOptions = useMemo(() => {
    const filterOptions = (type) => {
      const options = type === "stocks" ? STOCK_OPTIONS : CRYPTO_OPTIONS;
      const searchTerm = financeState[type]?.searchTerm?.toLowerCase() || "";

      return options.filter(
        (option) =>
          option.symbol?.toLowerCase()?.includes(searchTerm) ||
          option.name?.toLowerCase()?.includes(searchTerm)
      );
    };

    return {
      stocks: filterOptions("stocks"),
      crypto: filterOptions("crypto"),
    };
  }, [financeState]);

  const openModal = useCallback(
    (type) => {
      dispatch(setFinancePreset({ category: type, preset: "custom" }));
      const modal = document.getElementById(`my_modal_${type}`);
      if (modal) modal.showModal();
    },
    [dispatch]
  );

  const renderPresetOptions = useCallback(
    (type) => {
      if (type === "crypto") {
        const settings = financeState.crypto || {
          enabled: false,
          activePreset: "majors",
        };
        const coins = CRYPTO_PRESETS[0]?.symbols || CRYPTO_OPTIONS.map((o) => o.key);

        return (
          <div className="space-y-2">
            <label
              className={`${
                !settings.enabled ? "text-base-content/50" : "text-base-content"
              } .label btn btn-ghost justify-between flex items-center whitespace-nowrap`}
            >
              ₿  Crypto
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.enabled}
                onChange={() => {
                  dispatch(
                    setFinancePreset({ category: "crypto", preset: "majors" })
                  );
                  dispatch(toggleFinanceCategory({ category: "crypto" }));
                }}
              />
            </label>

            {settings.enabled && (
              <div className="space-y-2 ml-2 p-2 border-l border-base-300/50">
                <p className="text-xs opacity-60">
                  Streaming all supported Binance USDT pairs.
                </p>
                <div className="flex flex-wrap gap-2">
                  {coins.map((symbol) => {
                    const option = CRYPTO_OPTIONS.find((o) => o.key === symbol);
                    return (
                      <span
                        key={symbol}
                        className="badge badge-outline badge-sm font-medium"
                      >
                        {option?.label || symbol}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }

      const presets = STOCK_PRESETS;
      const settings = financeState.stocks || {
        enabled: false,
        activePreset: null,
      };
      const selectedCount = getSelected("stocks").length;

      return (
        <div>
          <label
            className={`${
              !settings.enabled ? "text-base-content/50" : "text-base-content"
            } .label btn btn-ghost justify-between flex items-center whitespace-nowrap`}
          >
            📈  Stocks
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={settings.enabled}
              onChange={() => {
                dispatch(toggleFinanceCategory({ category: "stocks" }));
              }}
            />
          </label>

          {settings.enabled && (
            <div className="space-y-2 ml-2 p-2 border-l border-base-300/50">
              {presets.map((preset) => (
                <label
                  key={preset.key}
                  className={`${
                    settings.activePreset === preset.key
                      ? "text-base-content font-semibold"
                      : "text-base-content/50"
                  } label cursor-pointer justify-start gap-3`}
                >
                  <input
                    type="radio"
                    name="stocks-preset"
                    className={`radio radio-sm ${
                      settings.activePreset === preset.key
                        ? "radio-primary"
                        : ""
                    }`}
                    checked={settings.activePreset === preset.key}
                    onChange={() => {
                      dispatch(
                        setFinancePreset({ category: "stocks", preset: preset.key })
                      );
                    }}
                  />
                  <span className="label-text">{preset.label}</span>
                </label>
              ))}
              <label
                className={`${
                  settings.activePreset === "custom"
                    ? "text-base-content font-semibold"
                    : "text-base-content/50"
                } label cursor-pointer justify-start gap-3`}
              >
                <input
                  type="radio"
                  name="stocks-preset"
                  className={`radio radio-sm ${
                    settings.activePreset === "custom" ? "radio-primary" : ""
                  }`}
                  checked={settings.activePreset === "custom"}
                  onChange={() => openModal("stocks")}
                  onClick={() => openModal("stocks")}
                />
                <span className="label-text">{selectedCount} selected</span>
              </label>
            </div>
          )}
        </div>
      );
    },
    [dispatch, financeState, getSelected, openModal]
  );

  const renderModal = useCallback(
    (type) => {
      const options = type === "stocks" ? STOCK_OPTIONS : CRYPTO_OPTIONS;
      const filtered = getFilteredOptions[type];
      const title = type === "stocks" ? "Stock" : "Crypto";
      const placeholder = type === "stocks"
        ? "Search stocks by name or symbol..."
        : "Search cryptocurrencies by name or symbol...";
      const settings = financeState[type] || {
        searchTerm: "",
        customSelections: {},
      };
      const selectedCount = getSelected(type).length;

      // Only render modal for stocks
      if (type === "crypto") {
        return null;
      }

      return (
        <dialog id={`my_modal_${type}`} className="modal">
          <div className="max-w-2xl modal-box">
            <form method="dialog">
              <button className="top-2 right-2 absolute btn btn-sm btn-circle btn-ghost">
                ✕
              </button>
            </form>
            <h3 className="mb-4 font-bold text-lg">{title} Selection</h3>

            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-base-content/70">
                {selectedCount} selected
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-outline btn btn-sm"
                  onClick={() =>
                    dispatch(toggleAllFinanceSelections({ category: type }))
                  }
                >
                  Toggle All
                </button>
                <button
                  className="btn-outline btn btn-sm"
                  onClick={() =>
                    dispatch(resetFinanceSelections({ category: type }))
                  }
                >
                  Reset
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder={placeholder}
              className="mb-4 input-bordered w-full input"
              value={settings.searchTerm}
              onChange={(e) =>
                dispatch(
                  setFinanceSearch({
                    category: type,
                    searchTerm: e.target.value,
                  })
                )
              }
            />

            <div className="gap-2 grid grid-cols-1 max-h-80 overflow-y-auto">
              {filtered.map((option) => (
                <label
                  key={option.symbol}
                  className="justify-start gap-3 cursor-pointer label"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={!!settings.customSelections[option.symbol]}
                    onChange={() =>
                      dispatch(
                        toggleFinanceSelection({
                          category: type,
                          symbol: option.symbol,
                        })
                      )
                    }
                  />
                  <span className="label-text">
                    {option.symbol} - {option.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </dialog>
      );
    },
    [dispatch, financeState, getFilteredOptions, getSelected]
  );

  return (
    <>
      <fieldset className="group p-4 border-none rounded-box w-full fieldset">
        <div className="gap-4 grid grid-cols-2">
          {renderPresetOptions("stocks")}
          {renderPresetOptions("crypto")}
        </div>
      </fieldset>

      {/* Modals */}
      {renderModal("stocks")}
    </>
  );
}
