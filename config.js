const CONFIG = {
  MICROSOFT_GRAPH: {
    AUTH_URL: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    ACCESS_TOKEN_URL: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    CLIENT_ID: "your_actual_client_id_from_azure",
    CLIENT_SECRET: "your_actual_client_secret_from_azure",
    SCOPE: "https://graph.microsoft.com/Files.ReadWrite offline_access",
    REDIRECT_URI: window.chrome.identity.getRedirectURL(),
  },
  ONEDRIVE: {
    FILE_PATH: "/ChromeExt - DB/DB.xlsx",
    TABLE_NAME: "LogTable",
  },
}

export default CONFIG
