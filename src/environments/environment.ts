export const environment = {
  production: false,
  // Backend API base. Going through the gateway is recommended.
  // Direct service ports if not using the gateway:
  //   auth:8081, shipment:8082, fleet:8083, dispatch:8084, driver:8085, notification:8086
  apiBaseUrl: 'http://localhost:9090'
};
