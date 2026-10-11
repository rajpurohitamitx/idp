const Severity = { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] };
const OnlineStatus = { type: 'string', enum: ['ONLINE', 'OFFLINE', 'WARNING', 'PROCESSING'] };
const HazardSource = { type: 'string', enum: ['CAMERA', 'SENSOR', 'FUSED', 'MANUAL'] };
const HazardStatus = { type: 'string', enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM'] };
const HazardType = {
  type: 'string',
  enum: ['NO_HELMET', 'NO_SAFETY_VEST', 'NO_GLOVES', 'NO_SAFETY_SHOES', 'GAS_LEAK', 'SMOKE', 'FIRE', 'HIGH_TEMPERATURE', 'THERMAL_ANOMALY', 'ELECTRICAL_ANOMALY', 'RESTRICTED_ZONE', 'UNKNOWN_HAZARD', 'OTHER'],
};
const SensorType = { type: 'string', enum: ['GAS', 'SMOKE', 'TEMPERATURE', 'HUMIDITY', 'ELECTRICAL', 'THERMAL', 'OTHER'] };
const DeviceType = { type: 'string', enum: ['CAMERA', 'ESP32', 'SENSOR_CONTROLLER', 'RFID_READER', 'THERMAL_SENSOR', 'GATEWAY', 'OTHER'] };
const Role = { type: 'string', enum: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] };
const AlertStatus = { type: 'string', enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM'] };
const IncidentStatus = { type: 'string', enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM'] };
const AccessDecision = { type: 'string', enum: ['PENDING_PPE', 'APPROVED', 'DENIED', 'UNKNOWN_CARD', 'INACTIVE_WORKER'] };
const CommandStatus = { type: 'string', enum: ['QUEUED', 'SENT', 'ACCEPTED', 'RUNNING', 'COMPLETED', 'FAILED', 'EXPIRED'] };

const success = (dataSchema: object, description = 'OK') => ({
  description,
  content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: dataSchema, message: { type: 'string' } } } } },
});
const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
});
const idParam = (name = 'id', desc = 'Resource identifier') => ({ name, in: 'path', required: true, schema: { type: 'string' }, description: desc });
const jsonBody = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });

export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Industrial Guardian API',
    version: '1.0.0',
    description:
      'Industrial safety monitoring platform. Two input pipelines (camera to AI vision, sensor hardware to threshold/anomaly analysis) feed a fusion, hazard, severity, alert engine. ' +
      'Humans authenticate with a JWT from /auth/login; hardware authenticates with a device token (prefix igd_) issued by POST /devices. Every response follows ' +
      '{ success, data, message } on success or { success: false, error: { code, message } } on failure.',
  },
  servers: [{ url: '/api', description: 'All paths below are relative to this prefix' }],
  tags: [
    { name: 'Authentication' }, { name: 'Users' }, { name: 'Workers' }, { name: 'Cameras' }, { name: 'Images' },
    { name: 'AI Analysis', description: 'Contract of the separate AI microservice (ai-service/), called internally by POST /images/analyze.' },
    { name: 'Sensors' }, { name: 'Devices' }, { name: 'RFID / Access' },
    { name: 'Hazards' }, { name: 'Alerts' }, { name: 'Incidents' }, { name: 'Restricted Zones' }, { name: 'Analytics' }, { name: 'Settings' }, { name: 'Audit' }, { name: 'Health' }, { name: 'Demo Mode' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Dashboard users (ADMIN/SUPERVISOR/OPERATOR). Obtained from POST /auth/login.' },
      deviceAuth: { type: 'http', scheme: 'bearer', description: 'Hardware only. Token prefix igd_, issued once by POST /devices or POST /devices/:id/rotate-token.' },
    },
    schemas: {
      ApiError: { type: 'object', properties: { success: { type: 'boolean', example: false }, error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: { type: 'object' } } } } },
      BoundingBox: { type: 'object', properties: { x: { type: 'integer' }, y: { type: 'integer' }, width: { type: 'integer' }, height: { type: 'integer' } } },
      Detection: { type: 'object', properties: { type: { type: 'string', example: 'NO_HELMET' }, confidence: { type: 'number', format: 'float', example: 0.93 }, boundingBox: { $ref: '#/components/schemas/BoundingBox' } } },
      PpeSummary: {
        type: 'object',
        properties: {
          helmet: { type: 'string', enum: ['PRESENT', 'MISSING', 'UNKNOWN'] }, vest: { type: 'string', enum: ['PRESENT', 'MISSING', 'UNKNOWN'] },
          gloves: { type: 'string', enum: ['PRESENT', 'MISSING', 'UNKNOWN'] }, shoes: { type: 'string', enum: ['PRESENT', 'MISSING', 'UNKNOWN'] },
          personDetected: { type: 'boolean' }, violations: { type: 'array', items: { type: 'string' } },
        },
      },
      User: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string', format: 'email' }, name: { type: 'string' }, role: Role, active: { type: 'boolean' }, createdAt: { type: 'string', format: 'date-time' } } },
      Worker: { type: 'object', properties: { id: { type: 'string' }, employeeId: { type: 'string' }, name: { type: 'string' }, department: { type: 'string', nullable: true }, designation: { type: 'string', nullable: true }, photoUrl: { type: 'string', nullable: true }, rfidUid: { type: 'string', nullable: true }, status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] } } },
      Device: { type: 'object', properties: { id: { type: 'string' }, deviceId: { type: 'string', example: 'ESP32-001' }, name: { type: 'string' }, type: DeviceType, location: { type: 'string' }, status: OnlineStatus, firmwareVersion: { type: 'string', nullable: true }, lastHeartbeat: { type: 'string', format: 'date-time', nullable: true }, lastCommunication: { type: 'string', format: 'date-time', nullable: true }, authorized: { type: 'boolean' } } },
      Camera: { type: 'object', properties: { id: { type: 'string' }, cameraId: { type: 'string', example: 'CAMERA-04' }, name: { type: 'string' }, location: { type: 'string' }, streamUrl: { type: 'string', nullable: true }, status: OnlineStatus, deviceId: { type: 'string', nullable: true }, isEntryCamera: { type: 'boolean' }, captureIntervalSeconds: { type: 'integer' }, lastHeartbeat: { type: 'string', format: 'date-time', nullable: true } } },
      Sensor: { type: 'object', properties: { id: { type: 'string' }, sensorId: { type: 'string', example: 'GAS-001' }, name: { type: 'string' }, type: SensorType, unit: { type: 'string', example: 'ppm' }, location: { type: 'string' }, status: OnlineStatus, warningThreshold: { type: 'number', nullable: true }, criticalThreshold: { type: 'number', nullable: true }, lowWarningThreshold: { type: 'number', nullable: true }, lastValue: { type: 'number', nullable: true }, lastReadingAt: { type: 'string', format: 'date-time', nullable: true } } },
      SensorReading: { type: 'object', properties: { eventId: { type: 'string' }, sensorId: { type: 'string' }, value: { type: 'number', nullable: true }, unit: { type: 'string' }, level: { type: 'string', enum: ['NORMAL', 'WARNING', 'CRITICAL', 'ANOMALY'] }, timestamp: { type: 'string', format: 'date-time' } } },
      Image: { type: 'object', properties: { id: { type: 'string' }, imageId: { type: 'string', example: 'IMG-000123' }, cameraId: { type: 'string' }, storagePath: { type: 'string' }, mimeType: { type: 'string' }, sizeBytes: { type: 'integer' }, location: { type: 'string' }, capturedAt: { type: 'string', format: 'date-time' }, status: { type: 'string', enum: ['RECEIVED', 'PROCESSING', 'COMPLETE', 'FAILED'] } } },
      ImageAnalysisResult: { type: 'object', properties: { imageId: { type: 'string' }, status: { type: 'string' }, overallResult: { type: 'string', enum: ['COMPLIANT', 'VIOLATION', 'NO_PERSON'] }, ppe: { $ref: '#/components/schemas/PpeSummary' }, hazardsCreated: { type: 'integer' } } },
      AiDetectionResponse: {
        type: 'object', description: 'Response contract of the AI microservice (ai-service) POST /analyze, consumed internally by the backend.',
        properties: { imageId: { type: 'string' }, modelName: { type: 'string', example: 'ppe-hazard-heuristic' }, modelVersion: { type: 'string', example: '1.0.0-cv' }, processingTimeMs: { type: 'integer' }, detections: { type: 'array', items: { $ref: '#/components/schemas/Detection' } } },
      },
      Hazard: { type: 'object', properties: { id: { type: 'string' }, hazardId: { type: 'string' }, type: HazardType, severity: Severity, location: { type: 'string' }, source: HazardSource, confidence: { type: 'number', nullable: true }, status: HazardStatus, createdAt: { type: 'string', format: 'date-time' } } },
      Alert: { type: 'object', properties: { id: { type: 'string' }, kind: { type: 'string', enum: ['HAZARD', 'DEVICE_OFFLINE', 'DEVICE_ONLINE', 'SYSTEM'] }, title: { type: 'string' }, message: { type: 'string' }, severity: Severity, status: AlertStatus, hazardId: { type: 'string', nullable: true }, location: { type: 'string', nullable: true }, acknowledgedBy: { type: 'string', nullable: true }, resolvedBy: { type: 'string', nullable: true }, createdAt: { type: 'string', format: 'date-time' } } },
      Incident: { type: 'object', properties: { id: { type: 'string' }, incidentId: { type: 'string' }, hazardId: { type: 'string' }, severity: Severity, location: { type: 'string' }, source: HazardSource, status: IncidentStatus, detectedAt: { type: 'string', format: 'date-time' }, acknowledgedAt: { type: 'string', format: 'date-time', nullable: true }, resolvedAt: { type: 'string', format: 'date-time', nullable: true }, resolvedBy: { type: 'string', nullable: true }, notes: { type: 'string', nullable: true } } },
      AccessLog: { type: 'object', properties: { id: { type: 'string' }, eventId: { type: 'string' }, rfidUid: { type: 'string' }, worker: { type: 'object', nullable: true, properties: { employeeId: { type: 'string' }, name: { type: 'string' } } }, decision: AccessDecision, reason: { type: 'string', nullable: true }, timestamp: { type: 'string', format: 'date-time' } } },
      RestrictedZone: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, location: { type: 'string' }, cameraId: { type: 'string' }, active: { type: 'boolean' }, region: { type: 'object', nullable: true, properties: { x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' } } } } },
      DeviceCommand: { type: 'object', properties: { commandId: { type: 'string' }, command: { type: 'string', example: 'CAPTURE_IMAGE' }, status: CommandStatus, issuedAt: { type: 'string', format: 'date-time' }, expiresAt: { type: 'string', format: 'date-time' } } },
      DashboardSnapshot: { type: 'object', properties: { activeAlerts: { type: 'integer' }, activeHazards: { type: 'integer' }, onlineCameras: { type: 'integer' }, onlineSensors: { type: 'integer' }, onlineDevices: { type: 'integer' }, workersMonitored: { type: 'integer' }, ppeCompliance: { type: 'number', nullable: true }, latestImage: { type: 'object', nullable: true }, latestReadings: { type: 'array', items: { type: 'object' } } } },
      SystemConfig: { type: 'object', description: 'Runtime-tunable rules, nothing is hard-coded. Overridable via PUT /settings.', properties: { camera: { type: 'object' }, sensor: { type: 'object' }, fusion: { type: 'object' }, severity: { type: 'object' }, heartbeat: { type: 'object' }, commands: { type: 'object' }, entry: { type: 'object' } } },
      AuditLogEntry: { type: 'object', properties: { id: { type: 'string' }, actor: { type: 'string' }, action: { type: 'string' }, entity: { type: 'string', nullable: true }, entityId: { type: 'string', nullable: true }, createdAt: { type: 'string', format: 'date-time' } } },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': { post: { tags: ['Authentication'], summary: 'Log in', security: [], requestBody: jsonBody({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } }), responses: { 200: success({ type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } }), 401: errorResponse('Invalid credentials') } } },
    '/auth/me': { get: { tags: ['Authentication'], summary: 'Current user', responses: { 200: success({ $ref: '#/components/schemas/User' }), 401: errorResponse('Not authenticated') } } },
    '/auth/logout': { post: { tags: ['Authentication'], summary: 'Log out', responses: { 200: success({}) } } },

    '/users': {
      get: { tags: ['Users'], summary: 'List users (ADMIN)', responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/User' } }) } },
      post: { tags: ['Users'], summary: 'Create user (ADMIN)', requestBody: jsonBody({ type: 'object', required: ['email', 'name', 'password', 'role'], properties: { email: { type: 'string' }, name: { type: 'string' }, password: { type: 'string', minLength: 10 }, role: Role } }), responses: { 201: success({ $ref: '#/components/schemas/User' }), 403: errorResponse('Not an admin') } },
    },
    '/users/{id}': {
      put: { tags: ['Users'], summary: 'Update user (ADMIN)', parameters: [idParam()], requestBody: jsonBody({ type: 'object' }), responses: { 200: success({ $ref: '#/components/schemas/User' }) } },
      delete: { tags: ['Users'], summary: 'Deactivate user (ADMIN)', parameters: [idParam()], responses: { 200: success({}) } },
    },

    '/workers': {
      get: { tags: ['Workers'], summary: 'List workers', responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/Worker' } }) } },
      post: { tags: ['Workers'], summary: 'Create worker (ADMIN)', requestBody: jsonBody({ type: 'object', required: ['employeeId', 'name'], properties: { employeeId: { type: 'string' }, name: { type: 'string' }, department: { type: 'string' }, designation: { type: 'string' }, rfidUid: { type: 'string' } } }), responses: { 201: success({ $ref: '#/components/schemas/Worker' }) } },
    },
    '/workers/{id}': {
      get: { tags: ['Workers'], summary: 'Get worker', parameters: [idParam()], responses: { 200: success({ $ref: '#/components/schemas/Worker' }), 404: errorResponse('Not found') } },
      put: { tags: ['Workers'], summary: 'Update worker (ADMIN)', parameters: [idParam()], requestBody: jsonBody({ type: 'object' }), responses: { 200: success({ $ref: '#/components/schemas/Worker' }) } },
      delete: { tags: ['Workers'], summary: 'Deactivate worker (ADMIN)', parameters: [idParam()], responses: { 200: success({}) } },
    },

    '/cameras': {
      get: { tags: ['Cameras'], summary: 'List cameras', responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/Camera' } }) } },
      post: { tags: ['Cameras'], summary: 'Register a camera (ADMIN)', requestBody: jsonBody({ type: 'object', required: ['cameraId', 'name', 'location'], properties: { cameraId: { type: 'string' }, name: { type: 'string' }, location: { type: 'string' }, deviceId: { type: 'string' }, isEntryCamera: { type: 'boolean' }, captureIntervalSeconds: { type: 'integer' } } }), responses: { 201: success({ $ref: '#/components/schemas/Camera' }) } },
    },
    '/cameras/{id}': {
      get: { tags: ['Cameras'], summary: 'Get camera (incl. latest image+analysis)', parameters: [idParam('id', 'cameraId, e.g. CAMERA-04')], responses: { 200: success({ allOf: [{ $ref: '#/components/schemas/Camera' }, { type: 'object', properties: { latestImage: { $ref: '#/components/schemas/Image' } } }] }), 404: errorResponse('Not found') } },
      put: { tags: ['Cameras'], summary: 'Update camera (ADMIN)', parameters: [idParam('id', 'cameraId')], requestBody: jsonBody({ type: 'object' }), responses: { 200: success({ $ref: '#/components/schemas/Camera' }) } },
      delete: { tags: ['Cameras'], summary: 'Delete camera (ADMIN)', parameters: [idParam('id', 'cameraId')], responses: { 200: success({}) } },
    },
    '/cameras/{id}/heartbeat': { post: { tags: ['Cameras'], summary: 'Camera heartbeat', parameters: [idParam('id', 'cameraId')], responses: { 200: success({ type: 'object', properties: { status: OnlineStatus } }) } } },
    '/cameras/{id}/capture': { post: { tags: ['Cameras'], summary: 'Request an on-demand capture (ADMIN/SUPERVISOR)', parameters: [idParam('id', 'cameraId')], responses: { 202: success({ $ref: '#/components/schemas/DeviceCommand' }, 'Capture requested') } } },
    '/cameras/images': { post: { tags: ['Cameras'], summary: 'Hardware-contract image upload (same handler as /images/analyze)', security: [{ bearerAuth: [] }, { deviceAuth: [] }], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['image', 'cameraId', 'timestamp'], properties: { image: { type: 'string', format: 'binary' }, cameraId: { type: 'string' }, deviceId: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' }, location: { type: 'string' } } } } } }, responses: { 201: success({ $ref: '#/components/schemas/ImageAnalysisResult' }) } } },

    '/images/analyze': {
      post: {
        tags: ['Images'], summary: 'Upload + analyze a camera image', security: [{ bearerAuth: [] }, { deviceAuth: [] }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['image', 'cameraId', 'timestamp'], properties: { image: { type: 'string', format: 'binary', description: 'JPEG, PNG or WebP, validated by both MIME type and magic bytes' }, cameraId: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' }, location: { type: 'string' } } } } } },
        responses: { 201: success({ $ref: '#/components/schemas/ImageAnalysisResult' }), 400: errorResponse('Invalid image or missing fields'), 415: errorResponse('Unsupported media type') },
      },
    },

    '/ai-service/analyze': {
      post: {
        tags: ['AI Analysis'],
        summary: '[Reference only - real path is POST {AI_SERVICE_URL}/analyze, e.g. http://localhost:8001/analyze]',
        description: 'Lives on the separate AI microservice (ai-service/), not this backend. Called internally from POST /images/analyze.',
        security: [],
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' }, imageId: { type: 'string' } } } } } },
        responses: { 200: { description: 'Detection result', content: { 'application/json': { schema: { $ref: '#/components/schemas/AiDetectionResponse' } } } } },
      },
    },
    '/ai-service/health': {
      get: {
        tags: ['AI Analysis'],
        summary: '[Reference only - real path is GET {AI_SERVICE_URL}/health]',
        description: 'Separate AI microservice health check. See /health on this API for the combined status check.',
        security: [],
        responses: { 200: { description: 'Healthy' } },
      },
    },

    '/sensors': {
      get: { tags: ['Sensors'], summary: 'List sensors', responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/Sensor' } }) } },
      post: { tags: ['Sensors'], summary: 'Register a sensor + configure thresholds (ADMIN)', requestBody: jsonBody({ type: 'object', required: ['sensorId', 'name', 'type', 'unit', 'location'], properties: { sensorId: { type: 'string' }, name: { type: 'string' }, type: SensorType, unit: { type: 'string' }, location: { type: 'string' }, deviceId: { type: 'string' }, warningThreshold: { type: 'number' }, criticalThreshold: { type: 'number' }, lowWarningThreshold: { type: 'number' }, requiredAbnormalReadings: { type: 'integer' }, rateOfChangeLimit: { type: 'number' } } }), responses: { 201: success({ $ref: '#/components/schemas/Sensor' }) } },
    },
    '/sensors/{id}': {
      get: { tags: ['Sensors'], summary: 'Get sensor + recent history', parameters: [idParam('id', 'sensorId')], responses: { 200: success({ allOf: [{ $ref: '#/components/schemas/Sensor' }, { type: 'object', properties: { history: { type: 'array', items: { $ref: '#/components/schemas/SensorReading' } } } }] }) } },
      put: { tags: ['Sensors'], summary: 'Update sensor configuration / thresholds (ADMIN)', parameters: [idParam('id', 'sensorId')], requestBody: jsonBody({ type: 'object' }), responses: { 200: success({ $ref: '#/components/schemas/Sensor' }) } },
      delete: { tags: ['Sensors'], summary: 'Delete sensor (ADMIN)', parameters: [idParam('id', 'sensorId')], responses: { 200: success({}) } },
    },
    '/sensors/{id}/readings': { post: { tags: ['Sensors'], summary: 'Submit a single sensor reading', security: [{ bearerAuth: [] }, { deviceAuth: [] }], parameters: [idParam('id', 'sensorId')], requestBody: jsonBody({ type: 'object', properties: { eventId: { type: 'string' }, value: { type: 'number' }, unit: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' }, grid: { type: 'object', description: 'AMG8833-style thermal array: { rows, columns, values[] }' } } }), responses: { 201: success({ type: 'object', properties: { accepted: { type: 'integer' }, duplicate: { type: 'boolean' }, hazardCreated: { type: 'boolean' } } }) } } },
    '/sensors/{id}/heartbeat': { post: { tags: ['Sensors'], summary: 'Sensor heartbeat', parameters: [idParam('id', 'sensorId')], responses: { 200: success({ type: 'object', properties: { status: OnlineStatus } }) } } },
    '/v1/sensors/readings': {
      post: {
        tags: ['Sensors'], summary: 'Batch sensor readings, hardware contract', security: [{ deviceAuth: [] }],
        requestBody: jsonBody({ type: 'object', required: ['deviceId', 'readings'], properties: { deviceId: { type: 'string' }, readings: { type: 'array', items: { type: 'object', required: ['sensorId', 'timestamp'], properties: { eventId: { type: 'string' }, sensorId: { type: 'string' }, sensorType: SensorType, value: { type: 'number' }, unit: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' } } } } } }),
        responses: { 201: success({ type: 'object', properties: { accepted: { type: 'integer' }, rejected: { type: 'integer' }, errors: { type: 'array', items: { type: 'object' } } } }), 401: errorResponse('Missing/invalid device token') },
      },
    },

    '/devices/register': { post: { tags: ['Devices'], summary: 'Hardware self-registration (only if ALLOW_DEVICE_AUTO_REGISTER=true)', security: [], requestBody: jsonBody({ type: 'object', required: ['deviceId', 'deviceType', 'deviceName', 'locationId'], properties: { deviceId: { type: 'string' }, deviceType: DeviceType, deviceName: { type: 'string' }, locationId: { type: 'string' }, firmwareVersion: { type: 'string' } } }), responses: { 201: success({ type: 'object', properties: { deviceId: { type: 'string' }, deviceToken: { type: 'string' } } }), 409: errorResponse('Device not pre-authorized by an admin') } } },
    '/devices/heartbeat': { post: { tags: ['Devices'], summary: 'Device heartbeat', security: [], requestBody: jsonBody({ type: 'object', required: ['deviceId'], properties: { deviceId: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' }, firmwareVersion: { type: 'string' }, uptimeSeconds: { type: 'integer' }, signalStrength: { type: 'integer' } } }), responses: { 200: success({ type: 'object', properties: { serverTime: { type: 'string' }, nextHeartbeatSeconds: { type: 'integer' }, status: OnlineStatus } }) } } },
    '/devices/{deviceId}/config': { get: { tags: ['Devices'], summary: 'Device operating configuration', security: [], parameters: [idParam('deviceId')], responses: { 200: success({ type: 'object', properties: { heartbeatIntervalSeconds: { type: 'integer' }, sensorUploadIntervalSeconds: { type: 'integer' }, imageCaptureIntervalSeconds: { type: 'integer' }, serverTime: { type: 'string' } } }) } } },
    '/devices/{id}/commands': { get: { tags: ['Devices'], summary: 'Poll queued commands (device token required)', security: [{ deviceAuth: [] }], parameters: [idParam()], responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/DeviceCommand' } }) } } },
    '/devices/commands/ack': { post: { tags: ['Devices'], summary: 'Acknowledge a command', security: [{ deviceAuth: [] }], requestBody: jsonBody({ type: 'object', required: ['commandId', 'deviceId', 'status'], properties: { commandId: { type: 'string' }, deviceId: { type: 'string' }, status: CommandStatus, result: { type: 'object' } } }), responses: { 200: success({ type: 'object', properties: { commandId: { type: 'string' }, status: CommandStatus } }) } } },
    '/devices': {
      get: { tags: ['Devices'], summary: 'List devices (ADMIN/SUPERVISOR)', responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/Device' } }) } },
      post: { tags: ['Devices'], summary: 'Pre-authorize a device, issuing its token once (ADMIN)', requestBody: jsonBody({ type: 'object', required: ['deviceId', 'name', 'type', 'location'], properties: { deviceId: { type: 'string' }, name: { type: 'string' }, type: DeviceType, location: { type: 'string' }, firmwareVersion: { type: 'string' } } }), responses: { 201: success({ allOf: [{ $ref: '#/components/schemas/Device' }, { type: 'object', properties: { deviceToken: { type: 'string', description: 'Shown only once' } } }] }) } },
    },
    '/devices/{id}': {
      get: { tags: ['Devices'], summary: 'Get device (ADMIN/SUPERVISOR)', parameters: [idParam('id', 'deviceId')], responses: { 200: success({ $ref: '#/components/schemas/Device' }), 404: errorResponse('Not found') } },
      put: { tags: ['Devices'], summary: 'Update device (ADMIN)', parameters: [idParam('id', 'deviceId')], requestBody: jsonBody({ type: 'object' }), responses: { 200: success({ $ref: '#/components/schemas/Device' }) } },
      delete: { tags: ['Devices'], summary: 'Deauthorize device (ADMIN)', parameters: [idParam('id', 'deviceId')], responses: { 200: success({}) } },
    },
    '/devices/{id}/rotate-token': { post: { tags: ['Devices'], summary: 'Rotate a device credential (ADMIN)', parameters: [idParam('id', 'deviceId')], responses: { 200: success({ type: 'object', properties: { deviceId: { type: 'string' }, deviceToken: { type: 'string' } } }) } } },

    '/access-events': {
      post: { tags: ['RFID / Access'], summary: 'RFID access event', security: [{ bearerAuth: [] }, { deviceAuth: [] }], requestBody: jsonBody({ type: 'object', required: ['eventId', 'deviceId', 'rfidUid', 'timestamp'], properties: { eventId: { type: 'string' }, deviceId: { type: 'string' }, readerId: { type: 'string' }, rfidUid: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' } } }), responses: { 201: success({ type: 'object', properties: { eventId: { type: 'string' }, decision: AccessDecision, worker: { type: 'object', nullable: true } } }) } },
      get: { tags: ['RFID / Access'], summary: 'List access log entries', responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/AccessLog' } }) } },
    },
    '/access-events/{eventId}/entry-check': {
      post: {
        tags: ['RFID / Access'], summary: 'Entry PPE check, resolves a PENDING_PPE access event to APPROVED/DENIED', security: [{ bearerAuth: [] }, { deviceAuth: [] }],
        parameters: [idParam('eventId', 'the RFID access event to resolve')],
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', required: ['image', 'cameraId'], properties: { image: { type: 'string', format: 'binary' }, cameraId: { type: 'string' } } } } } },
        responses: { 201: success({ type: 'object', properties: { eventId: { type: 'string' }, decision: AccessDecision, ppe: { $ref: '#/components/schemas/PpeSummary' }, hazardsCreated: { type: 'integer' } } }), 400: errorResponse('Access event already resolved, or no image supplied') },
      },
    },
    '/v1/access-events': { post: { tags: ['RFID / Access'], summary: 'RFID access event, hardware contract', security: [{ deviceAuth: [] }], requestBody: jsonBody({ type: 'object', required: ['eventId', 'deviceId', 'rfidUid', 'timestamp'], properties: { eventId: { type: 'string' }, deviceId: { type: 'string' }, readerId: { type: 'string' }, rfidUid: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' } } }), responses: { 201: success({ type: 'object', properties: { eventId: { type: 'string' }, decision: AccessDecision } }) } } },

    '/hazards': { get: { tags: ['Hazards'], summary: 'List hazards (filter by status/type/location/source)', parameters: [{ name: 'status', in: 'query', schema: HazardStatus }, { name: 'type', in: 'query', schema: HazardType }, { name: 'location', in: 'query', schema: { type: 'string' } }, { name: 'source', in: 'query', schema: HazardSource }], responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/Hazard' } }) } } },
    '/hazards/{id}': { get: { tags: ['Hazards'], summary: 'Get hazard', parameters: [idParam('id', 'hazardId')], responses: { 200: success({ $ref: '#/components/schemas/Hazard' }), 404: errorResponse('Not found') } } },
    '/hazards/manual': { post: { tags: ['Hazards'], summary: 'Report a hazard manually (ADMIN/SUPERVISOR)', requestBody: jsonBody({ type: 'object', required: ['type', 'severity', 'location'], properties: { type: HazardType, severity: Severity, location: { type: 'string' }, notes: { type: 'string' } } }), responses: { 201: success({ $ref: '#/components/schemas/Hazard' }) } } },

    '/alerts': { get: { tags: ['Alerts'], summary: 'List alerts (filter by status/severity)', parameters: [{ name: 'status', in: 'query', schema: AlertStatus }, { name: 'severity', in: 'query', schema: Severity }], responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/Alert' } }) } } },
    '/alerts/{id}/acknowledge': { post: { tags: ['Alerts'], summary: 'Acknowledge alert', parameters: [idParam()], responses: { 200: success({ $ref: '#/components/schemas/Alert' }) } } },
    '/alerts/{id}/resolve': { post: { tags: ['Alerts'], summary: 'Resolve alert (ADMIN/SUPERVISOR)', parameters: [idParam()], requestBody: jsonBody({ type: 'object', properties: { notes: { type: 'string' } } }), responses: { 200: success({ $ref: '#/components/schemas/Alert' }) } } },
    '/alerts/{id}/false-alarm': { post: { tags: ['Alerts'], summary: 'Mark as false alarm (ADMIN/SUPERVISOR)', parameters: [idParam()], requestBody: jsonBody({ type: 'object', properties: { notes: { type: 'string' } } }), responses: { 200: success({ $ref: '#/components/schemas/Alert' }) } } },

    '/incidents': {
      get: { tags: ['Incidents'], summary: 'List incidents (filter by status/severity/location/date range)', parameters: [{ name: 'status', in: 'query', schema: IncidentStatus }, { name: 'severity', in: 'query', schema: Severity }, { name: 'location', in: 'query', schema: { type: 'string' } }, { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } }], responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/Incident' } }) } },
      post: { tags: ['Incidents'], summary: 'Create incident manually (ADMIN/SUPERVISOR)', requestBody: jsonBody({ type: 'object', required: ['type', 'severity', 'location'], properties: { type: HazardType, severity: Severity, location: { type: 'string' }, notes: { type: 'string' } } }), responses: { 201: success({ $ref: '#/components/schemas/Incident' }) } },
    },
    '/incidents/{id}': {
      get: { tags: ['Incidents'], summary: 'Get incident', parameters: [idParam('id', 'incidentId')], responses: { 200: success({ $ref: '#/components/schemas/Incident' }) } },
      put: { tags: ['Incidents'], summary: 'Update incident notes/severity (ADMIN/SUPERVISOR)', parameters: [idParam('id', 'incidentId')], requestBody: jsonBody({ type: 'object', properties: { notes: { type: 'string' }, severity: Severity } }), responses: { 200: success({ $ref: '#/components/schemas/Incident' }) } },
    },
    '/incidents/{id}/resolve': { post: { tags: ['Incidents'], summary: 'Resolve incident (ADMIN/SUPERVISOR)', parameters: [idParam('id', 'incidentId')], requestBody: jsonBody({ type: 'object', properties: { notes: { type: 'string' } } }), responses: { 200: success({ $ref: '#/components/schemas/Incident' }) } } },

    '/restricted-zones': {
      get: { tags: ['Restricted Zones'], summary: 'List restricted zones', responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/RestrictedZone' } }) } },
      post: { tags: ['Restricted Zones'], summary: 'Define a restricted zone (ADMIN)', requestBody: jsonBody({ type: 'object', required: ['name', 'location', 'cameraId'], properties: { name: { type: 'string' }, location: { type: 'string' }, cameraId: { type: 'string' }, active: { type: 'boolean' }, region: { type: 'object', nullable: true } } }), responses: { 201: success({ $ref: '#/components/schemas/RestrictedZone' }) } },
    },
    '/restricted-zones/{id}': {
      put: { tags: ['Restricted Zones'], summary: 'Update zone (ADMIN)', parameters: [idParam()], requestBody: jsonBody({ type: 'object' }), responses: { 200: success({ $ref: '#/components/schemas/RestrictedZone' }) } },
      delete: { tags: ['Restricted Zones'], summary: 'Delete zone (ADMIN)', parameters: [idParam()], responses: { 200: success({}) } },
    },

    '/analytics/dashboard': { get: { tags: ['Analytics'], summary: 'Main dashboard snapshot', responses: { 200: success({ $ref: '#/components/schemas/DashboardSnapshot' }) } } },
    '/analytics': {
      get: {
        tags: ['Analytics'], summary: 'Safety / PPE / hazard / device-health analytics over a date range',
        parameters: [{ name: 'range', in: 'query', schema: { type: 'string', enum: ['today', '7d', '30d', 'custom'] } }, { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } }],
        responses: { 200: success({ type: 'object', properties: { range: { type: 'string' }, safety: { type: 'object' }, ppe: { type: 'object' }, hazards: { type: 'object' }, deviceHealth: { type: 'object' } } }) },
      },
    },

    '/settings': {
      get: { tags: ['Settings'], summary: 'Effective runtime configuration + raw overrides (ADMIN)', responses: { 200: success({ type: 'object', properties: { effective: { $ref: '#/components/schemas/SystemConfig' }, overrides: { type: 'object' } } }) } },
      put: { tags: ['Settings'], summary: 'Update configuration overrides (ADMIN)', requestBody: jsonBody({ type: 'object' }), responses: { 200: success({ $ref: '#/components/schemas/SystemConfig' }) } },
    },

    '/audit-logs': { get: { tags: ['Audit'], summary: 'List audit log entries (ADMIN)', parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', maximum: 500 } }], responses: { 200: success({ type: 'array', items: { $ref: '#/components/schemas/AuditLogEntry' } }) } } },

    '/health': { get: { tags: ['Health'], summary: 'Service health', security: [], responses: { 200: { description: 'Healthy' }, 503: { description: 'Degraded' } } } },

    '/demo/seed': { post: { tags: ['Demo Mode'], summary: 'Seed demo users/devices/cameras/sensors/history, every record isDemo=true', security: [], responses: { 200: success({ type: 'object' }), 403: errorResponse('DEMO_MODE_ENABLED=false') } } },
    '/demo/simulate/ppe-violation': { post: { tags: ['Demo Mode'], summary: 'Simulate a camera PPE violation end-to-end', security: [], responses: { 200: success({ type: 'object' }) } } },
    '/demo/simulate/fusion': { post: { tags: ['Demo Mode'], summary: 'Simulate the camera+sensor smoke/gas fusion scenario', security: [], responses: { 200: success({ type: 'object' }) } } },
    '/demo/simulate/access': { post: { tags: ['Demo Mode'], summary: 'Simulate an RFID access event', security: [], responses: { 200: success({ type: 'object' }) } } },
    '/demo/simulate/heartbeat': { post: { tags: ['Demo Mode'], summary: 'Simulate a device heartbeat', security: [], responses: { 200: success({ type: 'object' }) } } },
  },
};
