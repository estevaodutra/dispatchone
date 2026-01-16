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

const API_BASE_URL = "https://btvzspqcnzcslkdtddwl.supabase.co/functions/v1";

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
          curl: `curl -X POST "${API_BASE_URL}/send-text" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "message": "Olá! Esta é uma mensagem de teste."
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-text',
  {
    phone: '5511999999999',
    message: 'Olá! Esta é uma mensagem de teste.'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-text',
    json={
        'phone': '5511999999999',
        'message': 'Olá! Esta é uma mensagem de teste.'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
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
          curl: `curl -X POST "${API_BASE_URL}/send-media" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "mediaUrl": "https://example.com/image.jpg",
    "mediaType": "image",
    "caption": "Confira esta imagem!"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-media',
  {
    phone: '5511999999999',
    mediaUrl: 'https://example.com/image.jpg',
    mediaType: 'image',
    caption: 'Confira esta imagem!'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-media',
    json={
        'phone': '5511999999999',
        'mediaUrl': 'https://example.com/image.jpg',
        'mediaType': 'image',
        'caption': 'Confira esta imagem!'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
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
          curl: `curl -X POST "${API_BASE_URL}/send-document" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "documentUrl": "https://example.com/report.pdf",
    "fileName": "relatorio.pdf",
    "caption": "Segue o relatório solicitado"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-document',
  {
    phone: '5511999999999',
    documentUrl: 'https://example.com/report.pdf',
    fileName: 'relatorio.pdf',
    caption: 'Segue o relatório solicitado'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-document',
    json={
        'phone': '5511999999999',
        'documentUrl': 'https://example.com/report.pdf',
        'fileName': 'relatorio.pdf',
        'caption': 'Segue o relatório solicitado'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
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
          curl: `curl -X POST "${API_BASE_URL}/send-location" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "name": "Escritório Central",
    "address": "Av. Paulista, 1000 - São Paulo, SP"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-location',
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
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-location',
    json={
        'phone': '5511999999999',
        'latitude': -23.5505,
        'longitude': -46.6333,
        'name': 'Escritório Central',
        'address': 'Av. Paulista, 1000 - São Paulo, SP'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
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
          curl: `curl -X POST "${API_BASE_URL}/send-contact" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "contactName": "João Silva",
    "contactPhone": "5511988888888",
    "contactEmail": "joao@empresa.com",
    "contactOrganization": "Empresa XYZ"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-contact',
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
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-contact',
    json={
        'phone': '5511999999999',
        'contactName': 'João Silva',
        'contactPhone': '5511988888888',
        'contactEmail': 'joao@empresa.com',
        'contactOrganization': 'Empresa XYZ'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
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
                message: "Os dados do contato são inválidos ou incompletos."
              }
            }
          }
        }
      },
      {
        id: "send-list",
        method: "POST",
        path: "/send-list",
        description: "Envia uma mensagem com lista de opções interativas.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "Título da lista (máx: 60 caracteres)"
          },
          {
            name: "description",
            type: "string",
            required: true,
            description: "Descrição da lista (máx: 1024 caracteres)"
          },
          {
            name: "buttonText",
            type: "string",
            required: true,
            description: "Texto do botão para abrir a lista (máx: 20 caracteres)"
          },
          {
            name: "sections",
            type: "array",
            required: true,
            description: "Array de seções, cada uma com título e rows (opções)"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/send-list" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "title": "Menu de Opções",
    "description": "Selecione uma opção abaixo",
    "buttonText": "Ver opções",
    "sections": [
      {
        "title": "Produtos",
        "rows": [
          {"id": "prod_1", "title": "Produto A", "description": "Descrição do produto A"},
          {"id": "prod_2", "title": "Produto B", "description": "Descrição do produto B"}
        ]
      }
    ]
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-list',
  {
    phone: '5511999999999',
    title: 'Menu de Opções',
    description: 'Selecione uma opção abaixo',
    buttonText: 'Ver opções',
    sections: [
      {
        title: 'Produtos',
        rows: [
          { id: 'prod_1', title: 'Produto A', description: 'Descrição do produto A' },
          { id: 'prod_2', title: 'Produto B', description: 'Descrição do produto B' }
        ]
      }
    ]
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-list',
    json={
        'phone': '5511999999999',
        'title': 'Menu de Opções',
        'description': 'Selecione uma opção abaixo',
        'buttonText': 'Ver opções',
        'sections': [
            {
                'title': 'Produtos',
                'rows': [
                    {'id': 'prod_1', 'title': 'Produto A', 'description': 'Descrição do produto A'},
                    {'id': 'prod_2', 'title': 'Produto B', 'description': 'Descrição do produto B'}
                ]
            }
        ]
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E683",
              phone: "5511999999999",
              timestamp: "2024-01-15T10:55:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_LIST",
                message: "A estrutura da lista é inválida."
              }
            }
          }
        }
      },
      {
        id: "send-buttons",
        method: "POST",
        path: "/send-buttons",
        description: "Envia uma mensagem com botões de resposta rápida.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "Título da mensagem (máx: 60 caracteres)"
          },
          {
            name: "description",
            type: "string",
            required: false,
            description: "Descrição adicional (máx: 1024 caracteres)"
          },
          {
            name: "buttons",
            type: "array",
            required: true,
            description: "Array de botões (máx: 3), cada um com id e text"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/send-buttons" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "title": "Confirme sua escolha",
    "description": "Selecione uma das opções abaixo",
    "buttons": [
      {"id": "btn_yes", "text": "Sim"},
      {"id": "btn_no", "text": "Não"},
      {"id": "btn_maybe", "text": "Talvez"}
    ]
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-buttons',
  {
    phone: '5511999999999',
    title: 'Confirme sua escolha',
    description: 'Selecione uma das opções abaixo',
    buttons: [
      { id: 'btn_yes', text: 'Sim' },
      { id: 'btn_no', text: 'Não' },
      { id: 'btn_maybe', text: 'Talvez' }
    ]
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-buttons',
    json={
        'phone': '5511999999999',
        'title': 'Confirme sua escolha',
        'description': 'Selecione uma das opções abaixo',
        'buttons': [
            {'id': 'btn_yes', 'text': 'Sim'},
            {'id': 'btn_no', 'text': 'Não'},
            {'id': 'btn_maybe', 'text': 'Talvez'}
        ]
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E684",
              phone: "5511999999999",
              timestamp: "2024-01-15T11:00:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_BUTTONS",
                message: "A estrutura dos botões é inválida."
              }
            }
          }
        }
      },
      {
        id: "send-reaction",
        method: "POST",
        path: "/send-reaction",
        description: "Envia uma reação (emoji) a uma mensagem existente.",
        attributes: [
          {
            name: "phone",
            type: "string",
            required: true,
            description: "Número no formato DDI+DDD+Número (ex: 5511999999999)"
          },
          {
            name: "messageId",
            type: "string",
            required: true,
            description: "ID da mensagem a ser reagida"
          },
          {
            name: "reaction",
            type: "string",
            required: true,
            description: "Emoji da reação (ex: '👍', '❤️', '😂')"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/send-reaction" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "phone": "5511999999999",
    "messageId": "BAE5F4A3C2D1E678",
    "reaction": "👍"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/send-reaction',
  {
    phone: '5511999999999',
    messageId: 'BAE5F4A3C2D1E678',
    reaction: '👍'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/send-reaction',
    json={
        'phone': '5511999999999',
        'messageId': 'BAE5F4A3C2D1E678',
        'reaction': '👍'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              messageId: "BAE5F4A3C2D1E685",
              reactionTo: "BAE5F4A3C2D1E678",
              timestamp: "2024-01-15T11:05:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "MESSAGE_NOT_FOUND",
                message: "A mensagem referenciada não foi encontrada."
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
    description: "Gerenciamento de conexão WhatsApp",
    endpoints: [
      {
        id: "list-instances",
        method: "GET",
        path: "/instances",
        description: "Lista todas as instâncias do WhatsApp associadas à conta.",
        attributes: [
          {
            name: "page",
            type: "number",
            required: false,
            description: "Página para paginação (default: 1)"
          },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Limite de resultados por página (default: 10, máx: 100)"
          }
        ],
        examples: {
          curl: `curl -X GET "${API_BASE_URL}/instances?page=1&limit=10" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.get(
  '${API_BASE_URL}/instances',
  {
    params: { page: 1, limit: 10 },
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.get(
    '${API_BASE_URL}/instances',
    params={'page': 1, 'limit': 10},
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
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
                  name: "WhatsApp Principal",
                  phone: "5511999999999",
                  status: "connected",
                  createdAt: "2024-01-15T08:00:00Z"
                }
              ],
              pagination: {
                page: 1,
                limit: 10,
                total: 1
              }
            }
          },
          error: {
            code: 401,
            body: {
              success: false,
              error: {
                code: "UNAUTHORIZED",
                message: "Token de autenticação inválido ou expirado."
              }
            }
          }
        }
      },
      {
        id: "find-instance",
        method: "GET",
        path: "/instance/find",
        description: "Busca uma instância específica por ID ou número de telefone.",
        attributes: [
          {
            name: "instanceId",
            type: "string",
            required: false,
            description: "ID da instância"
          },
          {
            name: "phone",
            type: "string",
            required: false,
            description: "Número de telefone da instância"
          }
        ],
        examples: {
          curl: `curl -X GET "${API_BASE_URL}/instance/find?instanceId=inst_abc123" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.get(
  '${API_BASE_URL}/instance/find',
  {
    params: { instanceId: 'inst_abc123' },
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.get(
    '${API_BASE_URL}/instance/find',
    params={'instanceId': 'inst_abc123'},
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
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
                name: "WhatsApp Principal",
                phone: "5511999999999",
                status: "connected",
                createdAt: "2024-01-15T08:00:00Z",
                lastMessageAt: "2024-01-15T11:30:00Z",
                messagesCount: 1542
              }
            }
          },
          error: {
            code: 404,
            body: {
              success: false,
              error: {
                code: "INSTANCE_NOT_FOUND",
                message: "Instância não encontrada."
              }
            }
          }
        }
      },
      {
        id: "update-instance-status",
        method: "PUT",
        path: "/instance/status",
        description: "Atualiza o status de uma instância (pausar/ativar envios).",
        attributes: [
          {
            name: "instanceId",
            type: "string",
            required: true,
            description: "ID da instância"
          },
          {
            name: "status",
            type: "string",
            required: true,
            description: "Novo status: 'active', 'paused' ou 'maintenance'"
          }
        ],
        examples: {
          curl: `curl -X PUT "${API_BASE_URL}/instance/status" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "instanceId": "inst_abc123",
    "status": "paused"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.put(
  '${API_BASE_URL}/instance/status',
  {
    instanceId: 'inst_abc123',
    status: 'paused'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.put(
    '${API_BASE_URL}/instance/status',
    json={
        'instanceId': 'inst_abc123',
        'status': 'paused'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              instanceId: "inst_abc123",
              previousStatus: "active",
              newStatus: "paused",
              updatedAt: "2024-01-15T12:00:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_STATUS",
                message: "Status inválido. Use: 'active', 'paused' ou 'maintenance'."
              }
            }
          }
        }
      },
      {
        id: "get-qrcode",
        method: "GET",
        path: "/instance/qrcode",
        description: "Obtém o QR Code para conectar uma nova instância do WhatsApp.",
        attributes: [],
        examples: {
          curl: `curl -X GET "${API_BASE_URL}/instance/qrcode" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.get(
  '${API_BASE_URL}/instance/qrcode',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.get(
    '${API_BASE_URL}/instance/qrcode',
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              qrcode: "data:image/png;base64,iVBORw0KGgo...",
              expiresIn: 60
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INSTANCE_ALREADY_CONNECTED",
                message: "A instância já está conectada."
              }
            }
          }
        }
      },
      {
        id: "get-status",
        method: "GET",
        path: "/instance/status",
        description: "Verifica o status da conexão da instância do WhatsApp.",
        attributes: [],
        examples: {
          curl: `curl -X GET "${API_BASE_URL}/instance/status" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.get(
  '${API_BASE_URL}/instance/status',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.get(
    '${API_BASE_URL}/instance/status',
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              status: "connected",
              phone: "5511999999999",
              name: "Meu WhatsApp",
              connectedAt: "2024-01-15T08:00:00Z"
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INSTANCE_NOT_FOUND",
                message: "Instância não encontrada."
              }
            }
          }
        }
      },
      {
        id: "disconnect",
        method: "POST",
        path: "/instance/disconnect",
        description: "Desconecta a instância do WhatsApp.",
        attributes: [],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/instance/disconnect" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/instance/disconnect',
  {},
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/instance/disconnect',
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              message: "Instância desconectada com sucesso."
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INSTANCE_NOT_CONNECTED",
                message: "A instância não está conectada."
              }
            }
          }
        }
      },
      {
        id: "restart",
        method: "POST",
        path: "/instance/restart",
        description: "Reinicia a instância do WhatsApp.",
        attributes: [],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/instance/restart" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/instance/restart',
  {},
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/instance/restart',
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              message: "Instância reiniciada com sucesso."
            }
          },
          error: {
            code: 500,
            body: {
              success: false,
              error: {
                code: "RESTART_FAILED",
                message: "Falha ao reiniciar a instância."
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
    description: "Configuração de webhooks para recebimento de eventos",
    endpoints: [
      {
        id: "set-webhook",
        method: "POST",
        path: "/webhook/set",
        description: "Configura a URL do webhook para receber eventos.",
        attributes: [
          {
            name: "url",
            type: "string",
            required: true,
            description: "URL do webhook (deve ser HTTPS)"
          },
          {
            name: "events",
            type: "array",
            required: false,
            description: "Lista de eventos a receber (default: todos)"
          },
          {
            name: "secret",
            type: "string",
            required: false,
            description: "Segredo para validação de assinatura do webhook"
          }
        ],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/webhook/set" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "url": "https://meusite.com/webhook",
    "events": ["message.received", "message.sent", "message.delivered"],
    "secret": "meu_segredo_webhook"
  }'`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/webhook/set',
  {
    url: 'https://meusite.com/webhook',
    events: ['message.received', 'message.sent', 'message.delivered'],
    secret: 'meu_segredo_webhook'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/webhook/set',
    json={
        'url': 'https://meusite.com/webhook',
        'events': ['message.received', 'message.sent', 'message.delivered'],
        'secret': 'meu_segredo_webhook'
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              webhookId: "wh_abc123",
              url: "https://meusite.com/webhook",
              events: ["message.received", "message.sent", "message.delivered"]
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "INVALID_WEBHOOK_URL",
                message: "A URL do webhook é inválida ou não é HTTPS."
              }
            }
          }
        }
      },
      {
        id: "get-webhook",
        method: "GET",
        path: "/webhook",
        description: "Obtém a configuração atual do webhook.",
        attributes: [],
        examples: {
          curl: `curl -X GET "${API_BASE_URL}/webhook" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.get(
  '${API_BASE_URL}/webhook',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.get(
    '${API_BASE_URL}/webhook',
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              webhook: {
                id: "wh_abc123",
                url: "https://meusite.com/webhook",
                events: ["message.received", "message.sent"],
                createdAt: "2024-01-10T10:00:00Z",
                lastDeliveryAt: "2024-01-15T09:30:00Z"
              }
            }
          },
          error: {
            code: 404,
            body: {
              success: false,
              error: {
                code: "WEBHOOK_NOT_CONFIGURED",
                message: "Nenhum webhook configurado."
              }
            }
          }
        }
      },
      {
        id: "delete-webhook",
        method: "DELETE",
        path: "/webhook",
        description: "Remove a configuração do webhook.",
        attributes: [],
        examples: {
          curl: `curl -X DELETE "${API_BASE_URL}/webhook" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.delete(
  '${API_BASE_URL}/webhook',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.delete(
    '${API_BASE_URL}/webhook',
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              message: "Webhook removido com sucesso."
            }
          },
          error: {
            code: 404,
            body: {
              success: false,
              error: {
                code: "WEBHOOK_NOT_FOUND",
                message: "Webhook não encontrado."
              }
            }
          }
        }
      },
      {
        id: "test-webhook",
        method: "POST",
        path: "/webhook/test",
        description: "Envia um evento de teste para o webhook configurado.",
        attributes: [],
        examples: {
          curl: `curl -X POST "${API_BASE_URL}/webhook/test" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
          nodejs: `const axios = require('axios');

const response = await axios.post(
  '${API_BASE_URL}/webhook/test',
  {},
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  }
);`,
          python: `import requests

response = requests.post(
    '${API_BASE_URL}/webhook/test',
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN'
    }
)`
        },
        responses: {
          success: {
            code: 200,
            body: {
              success: true,
              message: "Evento de teste enviado com sucesso.",
              statusCode: 200,
              responseTime: 150
            }
          },
          error: {
            code: 400,
            body: {
              success: false,
              error: {
                code: "WEBHOOK_TEST_FAILED",
                message: "Falha ao enviar evento de teste."
              }
            }
          }
        }
      }
    ]
  }
];

export const eventTypes = [
  { id: "message.received", name: "message.received", description: "Mensagem recebida" },
  { id: "message.sent", name: "message.sent", description: "Mensagem enviada" },
  { id: "message.delivered", name: "message.delivered", description: "Mensagem entregue" },
  { id: "message.read", name: "message.read", description: "Mensagem lida" },
  { id: "message.failed", name: "message.failed", description: "Falha no envio" },
  { id: "status.online", name: "status.online", description: "Contato online" },
  { id: "status.offline", name: "status.offline", description: "Contato offline" },
  { id: "status.typing", name: "status.typing", description: "Contato digitando" },
  { id: "connection.connected", name: "connection.connected", description: "Instância conectada" },
  { id: "connection.disconnected", name: "connection.disconnected", description: "Instância desconectada" },
  { id: "connection.qr_updated", name: "connection.qr_updated", description: "QR Code atualizado" }
];
