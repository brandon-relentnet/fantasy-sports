import { createSlice } from "@reduxjs/toolkit";

export const DEFAULT_RSS_FEEDS = [
    {
        id: "default-npr",
        name: "NPR Top Stories",
        url: "https://feeds.npr.org/1001/rss.xml",
        category: "National News",
        isDefault: true,
    },
    {
        id: "default-cbs",
        name: "CBS News Latest",
        url: "https://www.cbsnews.com/latest/rss/main",
        category: "Breaking News",
        isDefault: true,
    },
    {
        id: "default-pbs",
        name: "PBS NewsHour Economy",
        url: "https://www.pbs.org/newshour/feeds/rss/economy",
        category: "Economy",
        isDefault: true,
    },
    {
        id: "default-ft",
        name: "Financial Times Front Page",
        url: "https://www.ft.com/rss/home",
        category: "Global Markets",
        isDefault: true,
    },
    {
        id: "default-cnn",
        name: "CNN Top Stories",
        url: "http://rss.cnn.com/rss/cnn_topstories.rss",
        category: "World News",
        isDefault: true,
    },
    {
        id: "default-nyt",
        name: "New York Times Front Page",
        url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
        category: "Headlines",
        isDefault: true,
    },
];

const DEFAULT_SELECTIONS = DEFAULT_RSS_FEEDS.reduce((acc, feed) => {
    acc[feed.id] = true;
    return acc;
}, {});

const mergeFeedsWithDefaults = (incomingFeeds = [], currentSelections = {}) => {
    const defaultIds = new Set(DEFAULT_RSS_FEEDS.map((feed) => feed.id));
    const sanitizedIncoming = incomingFeeds
        .filter((feed) => feed && !defaultIds.has(feed.id))
        .map((feed) => ({ ...feed, isDefault: false }));

    const merged = [...DEFAULT_RSS_FEEDS, ...sanitizedIncoming];
    const selections = { ...DEFAULT_SELECTIONS, ...currentSelections };

    sanitizedIncoming.forEach((feed) => {
        if (selections[feed.id] === undefined) {
            selections[feed.id] = true;
        }
    });

    return { mergedFeeds: merged, mergedSelections: selections };
};

const rssSlice = createSlice({
    name: "rss",
    initialState: {
        enabled: true,
        feeds: DEFAULT_RSS_FEEDS,
        customSelections: { ...DEFAULT_SELECTIONS },
        searchTerm: ''
    },
    reducers: {
        setRssEnabled: (state, action) => {
            state.enabled = action.payload;
        },
        addRssFeed: (state, action) => {
            // action.payload = { id, name, url, category }
            const exists = state.feeds.find((feed) => feed.id === action.payload.id);
            if (exists) return;
            state.feeds.push({ ...action.payload, isDefault: false });
            // Auto-enable the new feed
            state.customSelections[action.payload.id] = true;
        },
        removeRssFeed: (state, action) => {
            const feedId = action.payload;
            const feed = state.feeds.find((item) => item.id === feedId);
            if (feed?.isDefault) return;
            state.feeds = state.feeds.filter(feed => feed.id !== feedId);
            delete state.customSelections[feedId];
        },
        updateRssFeed: (state, action) => {
            const { id, updates } = action.payload;
            const index = state.feeds.findIndex(feed => feed.id === id);
            if (index !== -1) {
                state.feeds[index] = { ...state.feeds[index], ...updates };
            }
        },
        toggleRssSelection: (state, action) => {
            const feedId = action.payload;
            state.customSelections[feedId] = !state.customSelections[feedId];
        },
        setRssSearch: (state, action) => {
            state.searchTerm = action.payload;
        },
        toggleAllRssSelections: (state, action) => {
            const selectAll = action.payload;
            state.feeds.forEach(feed => {
                state.customSelections[feed.id] = selectAll;
            });
        },
        resetRssSelections: (state) => {
            state.customSelections = { ...DEFAULT_SELECTIONS };
        },
        setRssFeeds: (state, action) => {
            const { mergedFeeds, mergedSelections } = mergeFeedsWithDefaults(action.payload, state.customSelections);
            state.feeds = mergedFeeds;
            state.customSelections = mergedSelections;
        },
        setState: (state, action) => {
            const nextState = { ...action.payload };
            const { mergedFeeds, mergedSelections } = mergeFeedsWithDefaults(nextState.feeds, nextState.customSelections);
            nextState.feeds = mergedFeeds;
            nextState.customSelections = mergedSelections;
            if (typeof nextState.enabled !== 'boolean') {
                nextState.enabled = true;
            }
            return nextState;
        },
    },
});

export const {
    setRssEnabled,
    addRssFeed,
    removeRssFeed,
    updateRssFeed,
    toggleRssSelection,
    setRssSearch,
    toggleAllRssSelections,
    resetRssSelections,
    setRssFeeds,
    setState
} = rssSlice.actions;

export default rssSlice.reducer;
