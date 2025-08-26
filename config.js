const CONFIG = {
  MICROSOFT_GRAPH: {
    AUTH_URL: "https://login.microsoftonline.com/86fb359e-1360-4ab3-b90d-2a68e8c007b9/oauth2/v2.0/authorize",
    ACCESS_TOKEN_URL: "https://login.microsoftonline.com/86fb359e-1360-4ab3-b90d-2a68e8c007b9/oauth2/v2.0/token",
    CLIENT_ID: "d18c065c-119d-42df-b7ee-7e957e1e4337",
    SCOPE: "https://graph.microsoft.com/.default offline_access",
    REDIRECT_URI: window.chrome.identity.getRedirectURL(),
  },
  ONEDRIVE: {
    FILE_PATH: "/ChromeExt - DB/DB.xlsx",
    TABLE_NAME: "LogTable",
  },
}

export default CONFIG
