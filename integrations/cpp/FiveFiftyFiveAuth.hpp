#pragma once
#include <string>
#include <windows.h>
#include <wininet.h>
#pragma comment(lib, "wininet.lib")

namespace FiveFiftyFive {
    class Licensing {
    public:
        static std::string GetMachineHWID() {
            HW_PROFILE_INFO hwProfileInfo;
            if (GetCurrentHwProfile(&hwProfileInfo)) {
                return std::string(hwProfileInfo.szHwProfileGuid);
            }
            return "UNKNOWN-HWID";
        }

        static bool ValidateLicense(const std::string& licenseKey, std::string& outSessionToken, std::string& outError) {
            std::string hwid = GetMachineHWID();
            std::string jsonPayload = "{\"license_key\":\"" + licenseKey + "\",\"hwid\":\"" + hwid + "\",\"client_type\":\"cpp\"}";

            HINTERNET hInternet = InternetOpenA("555Client-Native/1.2.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
            if (!hInternet) {
                outError = "Failed to initialize internet connection";
                return false;
            }

            HINTERNET hConnect = InternetConnectA(hInternet, "555client.xyz", INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            if (!hConnect) {
                InternetCloseHandle(hInternet);
                outError = "Failed to connect to licensing host";
                return false;
            }

            HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", "/api/licenses/validate", NULL, NULL, NULL, INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD, 0);
            if (!hRequest) {
                InternetCloseHandle(hConnect);
                InternetCloseHandle(hInternet);
                outError = "Failed to open HTTPS request";
                return false;
            }

            std::string headers = "Content-Type: application/json\r\n";
            BOOL sent = HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)jsonPayload.c_str(), (DWORD)jsonPayload.length());

            if (!sent) {
                InternetCloseHandle(hRequest);
                InternetCloseHandle(hConnect);
                InternetCloseHandle(hInternet);
                outError = "License validation request failed";
                return false;
            }

            char buffer[4096];
            DWORD bytesRead = 0;
            std::string response = "";
            while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
                buffer[bytesRead] = 0;
                response += buffer;
            }

            InternetCloseHandle(hRequest);
            InternetCloseHandle(hConnect);
            InternetCloseHandle(hInternet);

            if (response.find("\"valid\":true") != std::string::npos) {
                // Success
                size_t tokenPos = response.find("\"session_token\":\"");
                if (tokenPos != std::string::npos) {
                    size_t start = tokenPos + 17;
                    size_t end = response.find("\"", start);
                    outSessionToken = response.substr(start, end - start);
                }
                return true;
            }

            outError = "License invalid, expired, or device limit reached.";
            return false;
        }
    };
}
