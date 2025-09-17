import { useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  toggleRssSelection,
  setRssSearch,
  resetRssSelections,
  toggleAllRssSelections,
} from "@/entrypoints/store/rssSlice.js";
import { useAuth } from "@/entrypoints/components/hooks/useAuth.tsx";
import { useRssFeeds } from "@/entrypoints/components/hooks/useRssFeeds.tsx";

export function RssSection() {
  const dispatch = useDispatch();
  const rssState = useSelector((state) => state.rss);
  const { isAuthenticated } = useAuth();
  const { feeds, addFeed, deleteFeed, isLoading, error } = useRssFeeds();

  const [rssFormData, setRssFormData] = useState({
    name: "",
    url: "",
    category: "General",
  });

  const handleRssSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!rssFormData.name || !rssFormData.url) return;

      const result = await addFeed(rssFormData);
      if (result.success) {
        setRssFormData({ name: "", url: "", category: "General" });
      }
    },
    [rssFormData, addFeed]
  );

  const handleRssInputChange = useCallback((field, value) => {
    setRssFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const openRssModal = useCallback(() => {
    const dialog = document.getElementById("rss_modal");
    dialog?.showModal();
  }, []);

  const handleDeleteFeed = useCallback(
    async (feedId) => {
      const feed = feeds.find((item) => item.id === feedId);
      if (feed?.isDefault) return;
      await deleteFeed(feedId);
    },
    [deleteFeed, feeds]
  );

  const { defaultFeeds, customFeeds } = useMemo(() => {
    const defaults = feeds.filter((feed) => feed.isDefault);
    const customs = feeds.filter((feed) => !feed.isDefault);
    return { defaultFeeds: defaults, customFeeds: customs };
  }, [feeds]);

  return (
    <>
      <fieldset className="space-y-5 p-4 border-none rounded-box w-full fieldset">
        <section className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm">Curated Headlines</h4>
            <p className="opacity-70 text-xs">
              Toggle the sources you want to sample immediately.
            </p>
          </div>
          <div className="gap-2 grid">
            {defaultFeeds.map((feed) => (
              <label
                key={feed.id}
                className={`flex items-center justify-between rounded-xl border border-base-200/60 bg-base-100/80 px-4 py-3 ${
                  ''
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-sm leading-tight">
                    {feed.name}
                  </span>
                  <span className="opacity-60 text-xs">{feed.category}</span>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={Boolean(rssState?.customSelections?.[feed.id])}
                  onChange={() => dispatch(toggleRssSelection(feed.id))}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-sm">Your Custom Feeds</h4>
              <p className="opacity-70 text-xs">
                  {isAuthenticated
                    ? "Connect premium sources or niche alerts."
                    : "Sign in to add and organise your own RSS sources."}
                </p>
              </div>
              <button
                type="button"
                className="btn-outline btn btn-xs"
                onClick={openRssModal}
                disabled={feeds.length === 0}
              >
                Select (
                {
                  Object.values(rssState?.customSelections || {}).filter(
                    Boolean
                  ).length
                }
                )
              </button>
            </div>

            {isAuthenticated ? (
              <div className="space-y-3 bg-base-100/80 p-4 border border-base-200/60 rounded-2xl">
                <form onSubmit={handleRssSubmit} className="space-y-2">
                  <label className="floating-label">
                    <span>Feed Name</span>
                    <input
                      type="text"
                      placeholder="My News Feed"
                      className="w-full input input-sm"
                      value={rssFormData.name}
                      onChange={(e) =>
                        handleRssInputChange("name", e.target.value)
                      }
                    />
                  </label>
                  <label className="floating-label">
                    <span>RSS Feed URL</span>
                    <input
                      type="url"
                      placeholder="https://example.com/rss.xml"
                      className="w-full input input-sm"
                      value={rssFormData.url}
                      onChange={(e) =>
                        handleRssInputChange("url", e.target.value)
                      }
                    />
                  </label>
                  <label className="floating-label">
                    <span>Category</span>
                    <select
                      className="w-full select-sm select"
                      value={rssFormData.category}
                      onChange={(e) =>
                        handleRssInputChange("category", e.target.value)
                      }
                    >
                      <option value="General">General</option>
                      <option value="Tech">Tech</option>
                      <option value="News">News</option>
                      <option value="Sports">Sports</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 btn btn-sm btn-primary"
                      disabled={
                        isLoading || !rssFormData.name || !rssFormData.url
                      }
                    >
                      {isLoading ? "Adding..." : "Add to Collection"}
                    </button>
                    {customFeeds.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={openRssModal}
                      >
                        Manage
                      </button>
                    )}
                  </div>
                </form>

                {error && (
                  <div className="alert alert-error alert-sm">
                    <span className="text-xs">{error}</span>
                  </div>
                )}

                {customFeeds.length > 0 && (
                  <div className="space-y-2">
                    <p className="opacity-60 text-xs">
                      {customFeeds.length} custom feed
                      {customFeeds.length !== 1 ? "s" : ""} added
                    </p>
                    <div className="gap-2 grid">
                      {customFeeds.map((feed) => (
                        <div
                          key={feed.id}
                          className="flex justify-between items-center bg-base-200/70 px-3 py-2 rounded-lg"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {feed.name}
                            </span>
                            <span className="opacity-60 text-xs">
                              {feed.category || "General"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="toggle toggle-sm toggle-secondary"
                              checked={Boolean(
                                rssState?.customSelections?.[feed.id]
                              )}
                              onChange={() => dispatch(toggleRssSelection(feed.id))}
                            />
                            <button
                              className="text-error btn btn-xs btn-ghost"
                              onClick={() => handleDeleteFeed(feed.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-base-100/70 px-4 py-5 border border-base-200/60 rounded-2xl text-center">
                <p className="mb-3 text-sm text-base-content/70">
                  Ready to track niche sources? Sign in to connect your own
                  feeds and prioritise what matters to you.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const accountsTab = document.querySelector(
                      'input[aria-label="Tab 4"]'
                    );
                    if (accountsTab) accountsTab.click();
                  }}
                >
                  Login to Account
                </button>
              </div>
            )}
          </section>
      </fieldset>

      {/* RSS Selection Modal */}
      <dialog id="rss_modal" className="modal">
        <div className="max-w-2xl modal-box">
          <form method="dialog">
            <button className="top-2 right-2 absolute btn btn-sm btn-circle btn-ghost">
              ✕
            </button>
          </form>
          <h3 className="font-bold text-lg">RSS Feed Selection</h3>

          <div className="my-4 w-full form-control">
            <input
              type="text"
              placeholder="Search RSS feeds by name or category..."
              className="input-bordered w-full input"
              value={rssState?.searchTerm || ""}
              onChange={(e) => dispatch(setRssSearch(e.target.value))}
            />
          </div>

          <div className="flex gap-2 mb-4">
            <button
              className="btn-outline btn btn-sm"
              onClick={() => dispatch(toggleAllRssSelections(true))}
            >
              Select All
            </button>
            <button
              className="btn-outline btn btn-sm"
              onClick={() => dispatch(toggleAllRssSelections(false))}
            >
              Deselect All
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => dispatch(resetRssSelections())}
            >
              Reset to Default
            </button>
            {rssState?.searchTerm && (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => dispatch(setRssSearch(""))}
              >
                Clear Search
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {feeds.length === 0 ? (
              <div className="py-4 text-base-content/50 text-center">
                No RSS feeds in your collection. Add some feeds first!
              </div>
            ) : (
              feeds
                .filter((feed) => {
                  const searchTerm = (rssState?.searchTerm || "").toLowerCase();
                  if (!searchTerm) return true;
                  return (
                    feed.name.toLowerCase().includes(searchTerm) ||
                    feed.category.toLowerCase().includes(searchTerm)
                  );
                })
                .map((feed) => (
                  <div
                    key={feed.id}
                    className={`${
                      rssState.customSelections?.[feed.id]
                        ? "bg-base-200"
                        : "bg-base-200/50"
                    } p-3 rounded-lg flex items-center justify-between`}
                  >
                    <label className="flex flex-1 items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={rssState.customSelections?.[feed.id] || false}
                        onChange={() => dispatch(toggleRssSelection(feed.id))}
                      />
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-sm label-text">
                          {feed.name}
                        </span>
                        <span className="text-xs text-base-content/50 label-text">
                          {feed.category}
                        </span>
                      </div>
                    </label>
                    {!feed.isDefault && (
                      <button
                        className="text-error btn btn-ghost btn-xs"
                        onClick={() => handleDeleteFeed(feed.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
