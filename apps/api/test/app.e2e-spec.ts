import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "./../src/app.module";

describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/health (GET)", () => {
    it("should return health status", () => {
      return request(app.getHttpServer())
        .get("/api/health")
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty("status", "ok");
          expect(res.body).toHaveProperty("timestamp");
          expect(res.body).toHaveProperty("uptime");
        });
    });
  });

  describe("/convert/html (POST)", () => {
    it("should convert markdown to html", () => {
      return request(app.getHttpServer())
        .post("/api/convert/html")
        .send({
          markdown: "# Hello World",
        })
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toHaveProperty("html");
          expect(res.body.html).toContain("<h1>");
        });
    });

    it("should fail with empty markdown", () => {
      return request(app.getHttpServer())
        .post("/api/convert/html")
        .send({
          markdown: "",
        })
        .expect(400);
    });
  });
});
