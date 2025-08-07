import { getDefinitions, getDefaultConfig } from "./getDefinitions";

const mockFetch = vi.fn();
const mockConsole = {
  warn: vi.fn(),
  error: vi.fn(),
};

describe("getDefinitions", () => {
  beforeAll(() => {
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("console", mockConsole);
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("should fetch with default config", () => {
    mockFetch.mockResolvedValue({ json: () => ({ version: 1, features: [] }) });

    expect(getDefinitions()).resolves.toEqual({
      version: 1,
      features: [],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:4242/api/client/features",
      {
        headers: {
          authorization: "default:development.unleash-insecure-api-token",
          "content-type": "application/json",
          "user-agent": "nextjs",
          "unleash-client-spec": expect.stringMatching(/\d+\.\d+\.\d+.*/),
          "unleash-sdk": expect.stringContaining("unleash-nextjs-sdk:"),
          "unleash-appname": "nextjs",
        },
      }
    );
  });

  it("should warn about default config", () => {
    getDefinitions();

    expect(mockConsole.warn).toHaveBeenCalled();
  });

  it("should show an error when using default token", () => {
    getDefinitions();

    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining("Using fallback default token.")
    );
  });

  it("should read configuration from environment variables", () => {
    const url = "http://example.com/api";
    const token = "secure-token";
    const appName = "my-awesome-app";
    vi.stubEnv("NEXT_PUBLIC_UNLEASH_SERVER_API_URL", url);
    vi.stubEnv("UNLEASH_SERVER_API_TOKEN", token);
    vi.stubEnv("UNLEASH_APP_NAME", appName);

    getDefinitions();

    expect(mockFetch).toHaveBeenCalledWith(`${url}/client/features`, {
      headers: expect.objectContaining({
        authorization: token,
        "unleash-appname": appName,
        "user-agent": appName,
      }),
    });

    expect(mockConsole.warn).not.toHaveBeenCalled();
    expect(mockConsole.error).not.toHaveBeenCalled();
  });

  it("is using UNLEASH_SERVER_API_URL and will prioritize it over NEXT_PUBLIC_UNLEASH_SERVER_API_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_UNLEASH_SERVER_API_URL", "http://example.com/api");
    vi.stubEnv("UNLEASH_SERVER_API_URL", "http://example.org/api");

    getDefinitions();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://example.org/api/client/features",
      expect.anything()
    );
  });

  it("should allow for overriding the default config", () => {
    const url = "http://example.com/api/client/features";
    const token = "secure-token";
    const appName = "my-awesome-app";

    getDefinitions({
      url,
      appName,
      token,
    });

    expect(mockFetch).toHaveBeenCalledWith(url, {
      headers: expect.objectContaining({
        authorization: token,
        "unleash-appname": appName,
        "user-agent": appName,
      }),
    });

    expect(mockConsole.warn).not.toHaveBeenCalled();
    expect(mockConsole.error).not.toHaveBeenCalled();
  });

  it('should not modify "url" in config', () => {
    const url = "http://example.com/api/";
    getDefinitions({
      url,
    });

    expect(mockFetch).toHaveBeenCalledWith(url, expect.anything());
  });

  it('should add "instanceId"', () => {
    getDefinitions({
      instanceId: "my-instance-id",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:4242/api/client/features",
      {
        headers: expect.objectContaining({
          "unleash-instanceid": "my-instance-id",
        }),
      }
    );
  });

  it('should not set default token when "instanceId" is set', () => {
    getDefinitions({
      instanceId: "my-instance-id",
    });

    expect(mockFetch).toHaveBeenCalledWith(expect.anything(), {
      headers: expect.not.objectContaining({
        Authorization: expect.anything(),
      }),
    });
  });
});

describe("getDefaultConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should support UNLEASH_SERVER_API_URL with trailing slash", () => {
    vi.stubEnv("UNLEASH_SERVER_API_URL", "http://example.com/api/");

    expect(getDefaultConfig()).toHaveProperty(
      "url",
      "http://example.com/api/client/features"
    );
  });
  it("should support NEXT_PUBLIC_UNLEASH_SERVER_API_URL with trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_UNLEASH_SERVER_API_URL", "http://example.org/api/");

    expect(getDefaultConfig()).toHaveProperty(
      "url",
      "http://example.org/api/client/features"
    );
  });

  it("should set defaultToken", () => {
    expect(getDefaultConfig()).toHaveProperty(
      "token",
      "default:development.unleash-insecure-api-token"
    );
  });

  it("shouldn't set defaultToken when UNLEASH_SERVER_INSTANCE_ID is set", () => {
    vi.stubEnv("UNLEASH_SERVER_INSTANCE_ID", "instance-id-token");

    expect(getDefaultConfig()).not.toHaveProperty("token");
  });
});
