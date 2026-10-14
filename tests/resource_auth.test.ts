import { beforeEach,afterEach,it,expect,vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../example/convex/schema.js";
import { register } from "../src/test.js";
const http=vi.fn<typeof fetch>();
const action=(name:string)=>makeFunctionReference<"action">(`resources:${name}`);
const identity=(subject:string)=>({subject,issuer:"https://auth.test"});
function setup(){const t=convexTest(schema,import.meta.glob("../example/convex/**/*.{ts,js}"));register(t);return t;}
beforeEach(()=>{vi.useFakeTimers();vi.stubEnv("TINYFISH_API_KEY","fake-key");vi.stubGlobal("fetch",http);http.mockReset();});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();});
it("blocks unauthenticated resource creation without any paid call",async()=>{
  const t=setup();await expect(t.action(action("createProfile"),{name:"Work"})).rejects.toThrow("Sign in");await expect(t.action(action("createBrowser"),{})).rejects.toThrow("Sign in");expect(http).not.toHaveBeenCalled();
});
it("grants a created Profile to its owner and rejects another tenant",async()=>{
  const t=setup();http.mockResolvedValue(new Response(JSON.stringify({id:"prof-1",name:"Work",created_at:"2026-10-14"})));
  await t.withIdentity(identity("alice")).action(action("createProfile"),{name:"Work",set_as_default:true});
  expect(JSON.parse(String(http.mock.calls[0][1]?.body)).set_as_default).toBe(false);
  await expect(t.withIdentity(identity("bob")).action(action("getProfile"),{profileId:"prof-1"})).rejects.toThrow("not found");
  await expect(t.withIdentity(identity("bob")).action(action("startSetup"),{profileId:"prof-1"})).rejects.toThrow("not found");expect(http).toHaveBeenCalledTimes(1);
});
it("allows only the browser owner to terminate their session",async()=>{
  const t=setup();http.mockResolvedValueOnce(new Response(JSON.stringify({session_id:"br-1",cdp_url:"wss://test/cdp",base_url:"https://test"})));
  await t.withIdentity(identity("alice")).action(action("createBrowser"),{});
  await expect(t.withIdentity(identity("bob")).action(action("closeBrowser"),{sessionId:"br-1"})).rejects.toThrow("not found");expect(http).toHaveBeenCalledTimes(1);
  http.mockResolvedValueOnce(new Response(null,{status:204}));await t.withIdentity(identity("alice")).action(action("closeBrowser"),{sessionId:"br-1"});
  expect(await t.run(ctx=>ctx.db.query("resourceGrants").collect())).toEqual([]);
});
it("rejects account-default Profiles, ungranted IDs and global Vault access before enqueue",async()=>{
  const t=setup();const start=makeFunctionReference<"mutation">("agent:start");
  for(const options of [{use_profile:true},{use_profile:true,profile_id:"prof-other"},{use_vault:true}])await expect(t.withIdentity(identity("alice")).mutation(start,{idempotencyKey:"one",request:{url:"https://example.com",goal:"Read",...options}})).rejects.toThrow();expect(http).not.toHaveBeenCalled();
});
