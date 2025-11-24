/**
 * Centralized configuration for all API and WebSocket endpoints
 * This file contains all connection URLs used throughout the frontend
 */

// Environment detection
const isDevelopment = () => {
  const env = import.meta.env.VITE_ENV;
  return env === "development";
};

// Base configuration
const BASE_CONFIG = {
  development: {
    protocol: "http",
    wsProtocol: "ws",
    host: "localhost",
    ports: {
      accounts: Number(import.meta.env.VITE_ACCOUNTS_PORT) || 5000,
      finance: Number(import.meta.env.VITE_FINANCE_PORT) || 4001,
      sports: Number(import.meta.env.VITE_SPORTS_PORT) || 4000,
      fantasy: Number(import.meta.env.VITE_FANTASY_PORT) || 4002,
    },
  },
  production: {
    protocol: "https",
    wsProtocol: "wss",
    host: import.meta.env.VITE_API_URL,
    paths: {
      accounts: import.meta.env.VITE_ACCOUNTS_PORT || "/api/accounts",
      finance: import.meta.env.VITE_FINANCE_PORT || "/api/finance",
      sports: import.meta.env.VITE_SPORTS_PORT || "/api/sports",
      fantasy: import.meta.env.VITE_FANTASY_PATH || "/api/fantasy-yahoo",
    },
  },
};

// Get current environment configuration
const getConfig = () => {
  return isDevelopment() ? BASE_CONFIG.development : BASE_CONFIG.production;
};

// Helper function to build service base URL
const buildServiceUrl = (service) => {
  if (isDevelopment()) {
    return `${config.protocol}://${config.host}:${config.ports[service]}`;
  } else {
    // Remove trailing slash from path to prevent double slashes
    const path = config.paths[service].replace(/\/$/, "");
    return `${config.protocol}://${config.host}${path}`;
  }
};

const config = getConfig();
const fantasyBaseUrl = "https://enanimate.dev/yahoo";

// API Base URLs
export const API_ENDPOINTS = {
  accounts: {
    base: `${buildServiceUrl("accounts")}`,
    auth: {
      login: `${buildServiceUrl("accounts")}/auth/login`,
      register: `${buildServiceUrl("accounts")}/auth/register`,
      me: `${buildServiceUrl("accounts")}/auth/me`,
      settings: `${buildServiceUrl("accounts")}/auth/settings`,
      profile: `${buildServiceUrl("accounts")}/auth/profile`,
      changePassword: `${buildServiceUrl("accounts")}/auth/change-password`,
      rssFeeds: `${buildServiceUrl("accounts")}/auth/rss-feeds`,
    },
    health: `${buildServiceUrl("accounts")}/health`,
  },
  finance: {
    base: `${buildServiceUrl("finance")}`,
    trades: `${buildServiceUrl("finance")}/trades`,
    health: `${buildServiceUrl("finance")}/health`,
  },
  sports: {
    base: `${buildServiceUrl("sports")}`,
    games: `${buildServiceUrl("sports")}/games`,
    health: `${buildServiceUrl("sports")}/health`,
  },
  fantasy: {
    base: fantasyBaseUrl,
    leagues: () => `${fantasyBaseUrl}/leagues`,
    leagueStandings: (leagueKey) =>
      `${fantasyBaseUrl}/league/${encodeURIComponent(leagueKey)}/standings`,
    teamRoster: (teamKey, params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.date) searchParams.set("date", params.date);
      if (params.debug) searchParams.set("debug", params.debug);
      const query = searchParams.toString();
      return `${fantasyBaseUrl}/team/${encodeURIComponent(teamKey)}/roster${
        query ? `?${query}` : ""
      }`;
    },
    auth: {
      start: `${fantasyBaseUrl}/start`,
      callbackTest: `${fantasyBaseUrl}/auth/yahoo/callback/test`,
      config: `${fantasyBaseUrl}/auth/yahoo/config`,
    },
    health: `${fantasyBaseUrl}/health`,
  },
};

// WebSocket URLs
export const WS_ENDPOINTS = {
  finance: isDevelopment()
    ? `${config.wsProtocol}://${config.host}:${config.ports.finance}/ws`
    : `${config.wsProtocol}://${config.host}${config.paths.finance.replace(
        /\/$/,
        ""
      )}/ws`,
  sports: isDevelopment()
    ? `${config.wsProtocol}://${config.host}:${config.ports.sports}/ws`
    : `${config.wsProtocol}://${config.host}${config.paths.sports.replace(
        /\/$/,
        ""
      )}/ws`,
};

// Service configuration for health checks and connection utils
export const SERVICE_CONFIG = {
  accounts: {
    ...(isDevelopment()
      ? { port: config.ports.accounts }
      : { path: config.paths.accounts }),
    host: config.host,
    protocol: config.protocol,
  },
  finance: {
    ...(isDevelopment()
      ? { port: config.ports.finance }
      : { path: config.paths.finance }),
    host: config.host,
    protocol: config.protocol,
    wsProtocol: config.wsProtocol,
  },
  sports: {
    ...(isDevelopment()
      ? { port: config.ports.sports }
      : { path: config.paths.sports }),
    host: config.host,
    protocol: config.protocol,
    wsProtocol: config.wsProtocol,
  },
  fantasy: {
    ...(isDevelopment()
      ? { port: config.ports.fantasy }
      : { path: config.paths.fantasy }),
    host: config.host,
    protocol: config.protocol,
  },
};

// Helper function to build custom URLs if needed
export const buildUrl = (service, path = "") => {
  const serviceConfig = SERVICE_CONFIG[service];
  if (!serviceConfig) {
    throw new Error(`Unknown service: ${service}`);
  }

  if (isDevelopment()) {
    return `${serviceConfig.protocol}://${serviceConfig.host}:${serviceConfig.port}${path}`;
  } else {
    // Remove trailing slash from service path to prevent double slashes
    const cleanPath = serviceConfig.path.replace(/\/$/, "");
    return `${serviceConfig.protocol}://${serviceConfig.host}${cleanPath}${path}`;
  }
};

// Helper function to build WebSocket URLs
export const buildWsUrl = (service, path = "/ws") => {
  const serviceConfig = SERVICE_CONFIG[service];
  if (!serviceConfig) {
    throw new Error(`Unknown service: ${service}`);
  }

  if (isDevelopment()) {
    return `${serviceConfig.wsProtocol}://${serviceConfig.host}:${serviceConfig.port}${path}`;
  } else {
    // Remove trailing slash from service path to prevent double slashes
    const cleanPath = serviceConfig.path.replace(/\/$/, "");
    return `${serviceConfig.wsProtocol}://${serviceConfig.host}${cleanPath}${path}`;
  }
};

// Legacy compatibility - for files that expect just the base URL
export const API_BASE_URL = API_ENDPOINTS.accounts.base;

// Export default for easier importing
export default {
  API_ENDPOINTS,
  WS_ENDPOINTS,
  SERVICE_CONFIG,
  buildUrl,
  buildWsUrl,
  API_BASE_URL,
};
