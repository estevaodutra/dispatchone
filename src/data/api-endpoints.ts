export interface Attribute {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface Endpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  attributes: Attribute[];
  examples: {
    curl: string;
    nodejs: string;
    python: string;
  };
  responses: {
    success: {
      code: number;
      body: object;
    };
    error: {
      code: number;
      body: object;
    };
  };
}

export interface EndpointCategory {
  id: string;
  name: string;
  description: string;
  endpoints: Endpoint[];
}

export const apiEndpoints: EndpointCategory[] = [
  {
    id: "messages",
    name: "Mensagens",
    description: "Endpoints para envio de mensagens",
    endpoints: [
      {
        id: "send-text",
        method: "POST",
        path: "/send-text",
        description: "Envia uma mensagem de texto simples para um número de WhatsApp.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "message",
            type: "string",
            required: true,
            description: "Conteúdo da mensagem (máx: 4096 caracteres)"
          },
          {
            name: "delayMessage",
            type: "number",
            required: false,
            description: "Delay em segundos antes de enviar (0-30)"
          }
        ],
        examples: {
          curl: `curl -X POST "https://api.dispatchone.io/v1/send-text" \\
  -H "Content-Type: application/json" \\
  -H "x-instance-id: YOUR_INSTANCE_ID" \\
  -H "x-api-token: YOUR_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "message": "Olá! Esta é uma mensagem de teste."
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  'https://api.dispatchone.io/v1/send-text',
  {
    phone: '5511999999999',
    message: 'Olá! Esta é uma mensagem de teste.'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'x-instance-id': 'YOUR_INSTANCE_ID',
      'x-api-token': 'YOUR_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    'https://api.dispatchone.io/v1/send-text',
    json={
        'phone': '5511999999999',
        'message': 'Olá! Esta é uma mensagem de teste.'
    },
    headers={
        'Content-Type': 'application/json',
        'x-instance-id': 'YOUR_INSTANCE_ID',
        'x-api-token': 'YOUR_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E678",
              phone: "5511999999999",
              timestamp: "2024-01-15T10:30:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_PHONE",
                message: "O número de telefone fornecido é inválido."
              }
            }
          }
        }
      },
      {
        id: "send-media",
        method: "POST",
        path: "/send-media",
        description: "Envia uma imagem, vídeo ou áudio para um número de WhatsApp.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "mediaUrl",
            type: "string",
            required: true,
            description: "URL pública da mídia (imagem, vídeo ou áudio)"
          },
          {
            name: "mediaType",
            type: "string",
            required: true,
            description: "Tipo da mídia: 'image', 'video' ou 'audio'"
          },
          {
            name: "caption",
            type: "string",
            required: false,
            description: "Legenda da mídia (máx: 1024 caracteres)"
          }
        ],
        examples: {
          curl: `curl -X POST "https://api.dispatchone.io/v1/send-media" \\
  -H "Content-Type: application/json" \\
  -H "x-instance-id: YOUR_INSTANCE_ID" \\
  -H "x-api-token: YOUR_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "mediaUrl": "https://example.com/image.jpg",
    "mediaType": "image",
    "caption": "Confira esta imagem!"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  'https://api.dispatchone.io/v1/send-media',
  {
    phone: '5511999999999',
    mediaUrl: 'https://example.com/image.jpg',
    mediaType: 'image',
    caption: 'Confira esta imagem!'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'x-instance-id': 'YOUR_INSTANCE_ID',
      'x-api-token': 'YOUR_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    'https://api.dispatchone.io/v1/send-media',
    json={
        'phone': '5511999999999',
        'mediaUrl': 'https://example.com/image.jpg',
        'mediaType': 'image',
        'caption': 'Confira esta imagem!'
    },
    headers={
        'Content-Type': 'application/json',
        'x-instance-id': 'YOUR_INSTANCE_ID',
        'x-api-token': 'YOUR_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E679",
              phone: "5511999999999",
              mediaType: "image",
              timestamp: "2024-01-15T10:35:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_MEDIA_URL",
                message: "A URL da mídia não é acessível ou inválida."
              }
            }
          }
        }
      },
      {
        id: "send-document",
        method: "POST",
        path: "/send-document",
        description: "Envia um documento (PDF, DOC, XLS, etc.) para um número de WhatsApp.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "documentUrl",
            type: "string",
            required: true,
            description: "URL pública do documento"
          },
          {
            name: "fileName",
            type: "string",
            required: true,
            description: "Nome do arquivo com extensão (ex: 'relatorio.pdf')"
          },
          {
            name: "caption",
            type: "string",
            required: false,
            description: "Legenda do documento (máx: 1024 caracteres)"
          }
        ],
        examples: {
          curl: `curl -X POST "https://api.dispatchone.io/v1/send-document" \\
  -H "Content-Type: application/json" \\
  -H "x-instance-id: YOUR_INSTANCE_ID" \\
  -H "x-api-token: YOUR_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "documentUrl": "https://example.com/report.pdf",
    "fileName": "relatorio.pdf",
    "caption": "Segue o relatório solicitado"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  'https://api.dispatchone.io/v1/send-document',
  {
    phone: '5511999999999',
    documentUrl: 'https://example.com/report.pdf',
    fileName: 'relatorio.pdf',
    caption: 'Segue o relatório solicitado'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'x-instance-id': 'YOUR_INSTANCE_ID',
      'x-api-token': 'YOUR_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    'https://api.dispatchone.io/v1/send-document',
    json={
        'phone': '5511999999999',
        'documentUrl': 'https://example.com/report.pdf',
        'fileName': 'relatorio.pdf',
        'caption': 'Segue o relatório solicitado'
    },
    headers={
        'Content-Type': 'application/json',
        'x-instance-id': 'YOUR_INSTANCE_ID',
        'x-api-token': 'YOUR_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E680",
              phone: "5511999999999",
              fileName: "relatorio.pdf",
              timestamp: "2024-01-15T10:40:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_DOCUMENT",
                message: "O documento não pôde ser processado."
              }
            }
          }
        }
      },
      {
        id: "send-location",
        method: "POST",
        path: "/send-location",
        description: "Envia uma localização geográfica para um número de WhatsApp.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "latitude",
            type: "number",
            required: true,
            description: "Latitude da localização (-90 a 90)"
          },
          {
            name: "longitude",
            type: "number",
            required: true,
            description: "Longitude da localização (-180 a 180)"
          },
          {
            name: "name",
            type: "string",
            required: false,
            description: "Nome do local"
          },
          {
            name: "address",
            type: "string",
            required: false,
            description: "Endereço completo do local"
          }
        ],
        examples: {
          curl: `curl -X POST "https://api.dispatchone.io/v1/send-location" \\
  -H "Content-Type: application/json" \\
  -H "x-instance-id: YOUR_INSTANCE_ID" \\
  -H "x-api-token: YOUR_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "name": "Escritório Central",
    "address": "Av. Paulista, 1000 - São Paulo, SP"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  'https://api.dispatchone.io/v1/send-location',
  {
    phone: '5511999999999',
    latitude: -23.5505,
    longitude: -46.6333,
    name: 'Escritório Central',
    address: 'Av. Paulista, 1000 - São Paulo, SP'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'x-instance-id': 'YOUR_INSTANCE_ID',
      'x-api-token': 'YOUR_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    'https://api.dispatchone.io/v1/send-location',
    json={
        'phone': '5511999999999',
        'latitude': -23.5505,
        'longitude': -46.6333,
        'name': 'Escritório Central',
        'address': 'Av. Paulista, 1000 - São Paulo, SP'
    },
    headers={
        'Content-Type': 'application/json',
        'x-instance-id': 'YOUR_INSTANCE_ID',
        'x-api-token': 'YOUR_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E681",
              phone: "5511999999999",
              timestamp: "2024-01-15T10:45:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_COORDINATES",
                message: "As coordenadas fornecidas são inválidas."
              }
            }
          }
        }
      },
      {
        id: "send-contact",
        method: "POST",
        path: "/send-contact",
        description: "Envia um cartão de contato (vCard) para um número de WhatsApp.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "contactName",
            type: "string",
            required: true,
            description: "Nome completo do contato"
          },
          {
            name: "contactPhone",
            type: "string",
            required: true,
            description: "Número de telefone do contato"
          },
          {
            name: "contactEmail",
            type: "string",
            required: false,
            description: "E-mail do contato"
          },
          {
            name: "contactOrganization",
            type: "string",
            required: false,
            description: "Organização/Empresa do contato"
          }
        ],
        examples: {
          curl: `curl -X POST "https://api.dispatchone.io/v1/send-contact" \\
  -H "Content-Type: application/json" \\
  -H "x-instance-id: YOUR_INSTANCE_ID" \\
  -H "x-api-token: YOUR_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "contactName": "João Silva",
    "contactPhone": "5511988888888",
    "contactEmail": "joao@empresa.com",
    "contactOrganization": "Empresa XYZ"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  'https://api.dispatchone.io/v1/send-contact',
  {
    phone: '5511999999999',
    contactName: 'João Silva',
    contactPhone: '5511988888888',
    contactEmail: 'joao@empresa.com',
    contactOrganization: 'Empresa XYZ'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'x-instance-id': 'YOUR_INSTANCE_ID',
      'x-api-token': 'YOUR_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    'https://api.dispatchone.io/v1/send-contact',
    json={
        'phone': '5511999999999',
        'contactName': 'João Silva',
        'contactPhone': '5511988888888',
        'contactEmail': 'joao@empresa.com',
        'contactOrganization': 'Empresa XYZ'
    },
    headers={
        'Content-Type': 'application/json',
        'x-instance-id': 'YOUR_INSTANCE_ID',
        'x-api-token': 'YOUR_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E682",
              phone: "5511999999999",
              timestamp: "2024-01-15T10:50:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_CONTACT",
                message: "Os dados do contato são inválidos."
              }
            }
          }
        }
      }
    ]
  },
  {
    id: "instance",
    name: "Instância",
    description: "Endpoints para gerenciamento de instâncias",
    endpoints: [
      {
        id: "instances-list",
        method: "GET",
        path: "/instances",
        description: "Retorna a lista de todas as instâncias cadastradas na conta com suporte a paginação e filtros.",
        attributes: [
          {
            name: "page",
            type: "number",
            required: false,
            description: "Número da página (padrão: 1)"
          },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Itens por página (máx: 100, padrão: 20)"
          },
          {
            name: "status",
            type: "string",
            required: false,
            description: "Filtrar por status: 'connected', 'disconnected', 'waitingConnection'"
          },
          {
            name: "provider",
            type: "string",
            required: false,
            description: "Filtrar por provedor: 'z-api', 'evolution', 'meta'"
          }
        ],
        examples: {
          curl: `curl -X GET "https://api.dispatchone.io/v1/instances?page=1&limit=20&status=connected" \\
  -H "x-api-token: YOUR_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.get(
  'https://api.dispatchone.io/v1/instances',
  {
    params: {
      page: 1,
      limit: 20,
      status: 'connected'
    },
    headers: {
      'x-api-token': 'YOUR_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.get(
    'https://api.dispatchone.io/v1/instances',
    params={
        'page': 1,
        'limit': 20,
        'status': 'connected'
    },
    headers={
        'x-api-token': 'YOUR_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              data: [
                {
                  id: "inst_abc123",
                  name: "Atendimento Principal",
                  provider: "Z-API",
                  status: "connected",
                  phone: "5511999999999",
                  idInstance: "3E2535E6DDA3413414F54AAAADA6D328",
                  health: 98,
                  dispatches: 1250,
                  createdAt: "2024-01-05T10:00:00Z"
                }
              ],
              pagination: {
                page: 1,
                limit: 20,
                total: 5,
                totalPages: 1
              }
            }
          },
          error: {
            code: 401,
            body: {
              success: false,
              error: {
                code: "UNAUTHORIZED",
                message: "Token de autenticação inválido."
              }
            }
          }
        }
      },
      {
        id: "instance-find",
        method: "GET",
        path: "/instance/find",
        description: "Busca uma instância específica por diferentes critérios de identificação. Pelo menos um parâmetro de busca é obrigatório.",
        attributes: [
          {
            name: "id",
            type: "string",
            required: false,
            description: "ID interno da instância no dispatchOne"
          },
          {
            name: "phone",
            type: "string",
            required: false,
            description: "Número de telefone conectado (formato: 5511999999999)"
          },
          {
            name: "idInstance",
            type: "string",
            required: false,
            description: "ID externo da instância no provedor (Z-API, Evolution)"
          },
          {
            name: "tokenInstance",
            type: "string",
            required: false,
            description: "Token externo da instância no provedor"
          }
        ],
        examples: {
          curl: `curl -X GET "https://api.dispatchone.io/v1/instance/find?phone=5511999999999" \\
  -H "x-api-token: YOUR_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.get(
  'https://api.dispatchone.io/v1/instance/find',
  {
    params: {
      phone: '5511999999999'
    },
    headers: {
      'x-api-token': 'YOUR_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.get(
    'https://api.dispatchone.io/v1/instance/find',
    params={
        'phone': '5511999999999'
    },
    headers={
        'x-api-token': 'YOUR_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              instance: {
                id: "inst_abc123",
                name: "Atendimento Principal",
                provider: "Z-API",
                function: "dispatch",
                status: "connected",
                phone: "5511999999999",
                idInstance: "3E2535E6DDA3413414F54AAAADA6D328",
                tokenInstance: "8565E8B2253B010E11996B12",
                health: 98,
                dispatches: 1250,
                lastCheck: "2024-01-15T12:00:00Z",
                connectedAt: "2024-01-10T08:00:00Z",
                createdAt: "2024-01-05T10:00:00Z"
              }
            }
          },
          error: {
            code: 404,
            body: {
              success: false,
              error: {
                code: "INSTANCE_NOT_FOUND",
                message: "Nenhuma instância encontrada com os critérios informados."
              }
            }
          }
        }
      },
      {
        id: "instance-update-status",
        method: "PUT",
        path: "/instance/status",
        description: "Atualiza o status de conexão de uma instância. Utilizado internamente por webhooks de provedores ou para gerenciamento manual.",
        attributes: [
          {
            name: "instanceId",
            type: "string",
            required: true,
            description: "ID da instância a ser atualizada"
          },
          {
            name: "status",
            type: "string",
            required: true,
            description: "Novo status: 'connected', 'disconnected', 'waitingConnection'"
          },
          {
            name: "phone",
            type: "string",
            required: false,
            description: "Número conectado (obrigatório se status='connected')"
          },
          {
            name: "reason",
            type: "string",
            required: false,
            description: "Motivo da mudança de status (ex: 'Desconectado pelo usuário')"
          },
          {
            name: "metadata",
            type: "object",
            required: false,
            description: "Dados adicionais do provedor"
          }
        ],
        examples: {
          curl: `curl -X PUT "https://api.dispatchone.io/v1/instance/status" \\
  -H "Content-Type: application/json" \\
  -H "x-api-token: YOUR_TOKEN" \\
  -d '{
    "instanceId": "inst_abc123",
    "status": "disconnected",
    "reason": "Desconectado pelo usuário"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.put(
  'https://api.dispatchone.io/v1/instance/status',
  {
    instanceId: 'inst_abc123',
    status: 'disconnected',
    reason: 'Desconectado pelo usuário'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'x-api-token': 'YOUR_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.put(
    'https://api.dispatchone.io/v1/instance/status',
    json={
        'instanceId': 'inst_abc123',
        'status': 'disconnected',
        'reason': 'Desconectado pelo usuário'
    },
    headers={
        'Content-Type': 'application/json',
        'x-api-token': 'YOUR_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              instance: {
                id: "inst_abc123",
                status: "disconnected",
                updatedAt: "2024-01-15T12:30:00Z"
              },
              previousStatus: "connected"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_STATUS",
                message: "Status inválido. Use: 'connected', 'disconnected' ou 'waitingConnection'."
              }
            }
          }
        }
      }
    ]
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Endpoints para configuração e recebimento de webhooks",
    endpoints: [
      {
        id: "webhook-provider",
        method: "POST",
        path: "/webhook-provider",
        description: "Endpoint para receber eventos dos provedores de WhatsApp (Z-API, Evolution API, Meta).",
        attributes: [
          {
            name: "event_type",
            type: "string",
            required: true,
            description: "Tipo do evento (message, status, connection, etc.)"
          },
          {
            name: "instance_id",
            type: "string",
            required: true,
            description: "ID da instância que gerou o evento"
          },
          {
            name: "provider",
            type: "string",
            required: true,
            description: "Nome do provedor (z-api, evolution, meta)"
          },
          {
            name: "payload",
            type: "object",
            required: true,
            description: "Dados do evento específicos de cada provedor"
          }
        ],
        examples: {
          curl: `curl -X POST "https://api.dispatchone.io/v1/webhook-provider" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_type": "message.received",
    "instance_id": "inst_abc123",
    "provider": "z-api",
    "payload": {
      "messageId": "msg_xyz789",
      "from": "5511999999999",
      "body": "Olá, preciso de ajuda!",
      "timestamp": "2024-01-15T12:00:00Z"
    }
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  'https://api.dispatchone.io/v1/webhook-provider',
  {
    event_type: 'message.received',
    instance_id: 'inst_abc123',
    provider: 'z-api',
    payload: {
      messageId: 'msg_xyz789',
      from: '5511999999999',
      body: 'Olá, preciso de ajuda!',
      timestamp: '2024-01-15T12:00:00Z'
    }
  },
  {
    headers: {
      'Content-Type': 'application/json'
    }
  }
);`,
          python: `import requests

response = requests.post(
    'https://api.dispatchone.io/v1/webhook-provider',
    json={
        'event_type': 'message.received',
        'instance_id': 'inst_abc123',
        'provider': 'z-api',
        'payload': {
            'messageId': 'msg_xyz789',
            'from': '5511999999999',
            'body': 'Olá, preciso de ajuda!',
            'timestamp': '2024-01-15T12:00:00Z'
        }
    },
    headers={
        'Content-Type': 'application/json'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              eventId: "evt_abc123xyz",
              processed: true,
              timestamp: "2024-01-15T12:00:01Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_PAYLOAD",
                message: "O payload do evento é inválido ou está incompleto."
              }
            }
          }
        }
      },
      {
        id: "webhook-config",
        method: "PUT",
        path: "/webhook/config",
        description: "Configura a URL de webhook para receber eventos da instância.",
        attributes: [
          {
            name: "webhookUrl",
            type: "string",
            required: true,
            description: "URL HTTPS para receber os eventos"
          },
          {
            name: "events",
            type: "array",
            required: false,
            description: "Lista de eventos a receber (padrão: todos)"
          },
          {
            name: "headers",
            type: "object",
            required: false,
            description: "Headers customizados para as requisições"
          }
        ],
        examples: {
          curl: `curl -X PUT "https://api.dispatchone.io/v1/webhook/config" \\
  -H "Content-Type: application/json" \\
  -H "x-instance-id: YOUR_INSTANCE_ID" \\
  -H "x-api-token: YOUR_TOKEN" \\
  -d '{
    "webhookUrl": "https://meusite.com/webhook",
    "events": ["message.received", "message.sent", "status.change"],
    "headers": {
      "Authorization": "Bearer meu-token-secreto"
    }
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.put(
  'https://api.dispatchone.io/v1/webhook/config',
  {
    webhookUrl: 'https://meusite.com/webhook',
    events: ['message.received', 'message.sent', 'status.change'],
    headers: {
      Authorization: 'Bearer meu-token-secreto'
    }
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'x-instance-id': 'YOUR_INSTANCE_ID',
      'x-api-token': 'YOUR_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.put(
    'https://api.dispatchone.io/v1/webhook/config',
    json={
        'webhookUrl': 'https://meusite.com/webhook',
        'events': ['message.received', 'message.sent', 'status.change'],
        'headers': {
            'Authorization': 'Bearer meu-token-secreto'
        }
    },
    headers={
        'Content-Type': 'application/json',
        'x-instance-id': 'YOUR_INSTANCE_ID',
        'x-api-token': 'YOUR_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              message: "Webhook configurado com sucesso.",
              webhookUrl: "https://meusite.com/webhook",
              events: ["message.received", "message.sent", "status.change"]
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_WEBHOOK_URL",
                message: "A URL do webhook deve usar HTTPS."
              }
            }
          }
        }
      }
    ]
  }
];

export const eventTypes = [
  {
    id: "message.received",
    name: "message.received",
    description: "Disparado quando uma nova mensagem é recebida"
  },
  {
    id: "message.sent",
    name: "message.sent",
    description: "Disparado quando uma mensagem é enviada com sucesso"
  },
  {
    id: "message.delivered",
    name: "message.delivered",
    description: "Disparado quando uma mensagem é entregue ao destinatário"
  },
  {
    id: "message.read",
    name: "message.read",
    description: "Disparado quando uma mensagem é lida pelo destinatário"
  },
  {
    id: "status.change",
    name: "status.change",
    description: "Disparado quando o status da instância muda"
  },
  {
    id: "connection.update",
    name: "connection.update",
    description: "Disparado quando há atualização na conexão"
  }
];
