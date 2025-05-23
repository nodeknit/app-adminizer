import { AdminpanelConfig } from "adminizer";

const routePrefix = "/adminizer";

const models: AdminpanelConfig["models"] = {
    test: {
        title: 'Test model',
        model: 'test',
        fields: {
            createdAt: false,
            updatedAt: false,
            title: {
                title: 'Title',
                type: 'string',
                required: true
            },
            owner: false
        },
        list: {
            fields: {
                owner: false
            }
        },
        icon: 'receipt'
    },
    example: {
        title: 'All controls',
        model: 'example',
        tools: [
            {
                id: '1',
                link: `https://google.com`,
                type: 'blank',
                title: 'Some new action',
                icon: 'reorder',
            },
            {
                id: '2',
                link: `${routePrefix}/form/global`,
                type: 'self',
                title: 'Form example',
                icon: 'payment',
                accessRightsToken: 'read-example-form'
            },
            {
                id: '3',
                link: 'https://google.com',
                type: 'blank',
                title: 'Form example from file Form example from file',
                icon: 'touch_app',
                accessRightsToken: 'read-exampleFromFile-form'
            }
        ],
        fields: {
            createdAt: false,
            updatedAt: false,
            title: {
                title: 'Title',
                type: 'string',
                required: true
            },
            description: {
                title: 'Textarea',
                type: 'text',
                required: true,
                tooltip: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Hic, nisi.'
            },
            sort: {
                type: 'boolean',
                title: 'Boolean'
            },
            disabled_text: {
                title: 'Disabled',
                type: 'text',
                disabled: true,
                tooltip: 'This field should be disabled'
            },
            range: {
                type: 'range',
                title: 'Range',
                options: {
                    min: 10,
                    max: 80
                }
            },
            select: {
                title: 'Select',
                isIn: ['one', 'two', 'three']
            },
            date: {
                title: 'Date',
                type: 'date',
            },
            month: {
                title: 'Month',
                type: 'month',
            },
            datetime: {
                title: 'Date and time',
                type: 'datetime',
            },
            time: {
                title: 'time',
                type: 'time',
            },
            number: {
                title: 'Number',
                type: 'number',
            },
            color: {
                title: 'color',
                type: 'color',
            },
            week: {
                title: 'Week',
                type: 'week',
            },
            json: {
                type: 'jsoneditor'
            },
            tui: {
                type: 'tuieditor',
                options: {
                    name: 'toast-ui',
                    config: {
                        hideModeSwitch: true,
                        previewStyle: 'vertical',
                    },
                }
            },
            code: {
                title: 'Code',
                type: 'code',
                options: {
                    name: 'monaco',
                    config: {
                        language: 'typescript',
                    }
                }
            },
            geojson: {
                type: 'geo-polygon',
            },
            datatable: {
                title: 'Price',
                type: 'table',
                options: {
                    config: {
                        dataSchema: {name: null, footage: null, price: null},
                        colHeaders: ['One', 'Two', 'Three'],
                        columns: [
                            {data: 'name'},
                            {data: 'footage'},
                            {data: 'price'}
                        ],
                    }
                },
            },
            selectMany: {
                title: 'Select many',
                isIn: ['Sone', 'Stwo', 'Sthree', 'Sfour', 'Sfive'],
                type: 'select-many'
            },
            checkboxes: {
                title: 'Checkboxes',
                isIn: ['one', 'two', 'three']
            },
            editor: {
                title: 'Editor',
                type: 'wysiwyg',
                options: {
                    // name: 'react-quill',
                    name: 'ckeditor',
                    config: {
                        items: [
                            // 'sourceEditing', // This is for test, see full list of items in src/lib/controls/wysiwyg/CKeditor.ts
                            // 'showBlocks',
                            // '|',
                            'heading',
                            '|',
                            'bold',
                            'italic',
                            'underline',
                            '|',
                            // 'horizontalLine',
                            'link',
                            'insertImageViaUrl',
                            'insertTable',
                            'blockQuote',
                            '|',
                            'alignment',
                            '|',
                            'bulletedList',
                            'numberedList',
                            'outdent',
                            'indent',
                        ]
                    }
                }
            },
            testRelation: {
                title: 'Test one association',
                displayModifier: function (data) {
                    return data?.title;
                }
            },
            tests: {
                title: 'One to many association',
                displayModifier: function (data) {
                    return data?.title;
                }
            },
        },
        list: {
            fields: {
                json: false,
                tui: false,
                geojson: false,
                week: false,
                color: false,
                range: false,
                date: false,
                month: false,
                selectMany: false,
                select: false,
                dateTime: false,
                testRelation: false,
                tests: false,
                price: false,
                code: false,
                datatable: false
            },
            actions: {
                global: [
                    {
                        id: "1",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google',
                        icon: 'insert_link'
                    }, {
                        id: "2",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google',
                        icon: 'insert_link'
                    }, {
                        id: "3",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google',
                        icon: 'insert_link'
                    }, {
                        id: "4",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google',
                        icon: 'insert_link'
                    }, {
                        id: "5",
                        link: `${routePrefix}/form/global`,
                        type: 'self',
                        title: 'Form',
                        icon: 'insert_link'
                    },
                ],
                inline: [
                    {
                        id: "1",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google',
                        icon: 'insert_link'
                    },
                    {
                        id: "2",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google1',
                        icon: 'insert_link'
                    },
                    {
                        id: "3",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google2',
                        icon: 'insert_link'
                    },
                    {
                        id: "4",
                        link: `${routePrefix}/model/example/edit`,
                        type: 'self',
                        title: 'Test Edit',
                        icon: 'insert_link'
                    }
                ]
            }
        },
        icon: 'inbox'
    },
    jsonschema: {
        title: 'Json schema',
        model: 'jsonschema',
        fields: {
            data: {
                type: 'json',
                options: {
                    name: 'jsoneditor',
                    config: {
                        schema: {
                            'type': 'array',
                            "minItems": 1,
                            'items': {
                                '$ref': '#/definitions/badge'
                            },
                            'definitions': {
                                'badge': {
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'properties': {
                                        'text': {
                                            'type': 'string',
                                            'minLength': 3,
                                            'maxLength': 18
                                        },
                                        'color': {
                                            'type': 'string',
                                            'pattern': '^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$'
                                        },
                                        'textColor': {
                                            'type': 'string',
                                            'pattern': '^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$'
                                        }
                                    },
                                    'required': [
                                        'color',
                                        'text',
                                        'textColor'
                                    ]
                                }
                            }
                        },
                        mode: 'tree',
                        // json: []
                        // json: [
                        //     {text: 'Gray badge', color: '#808080', textColor: '#FFFFFF'},
                        //     {text: 'Silver badge', color: '#C0C0C0', textColor: '#000000'},
                        //     {text: 'White badge', color: '#FFFFFF', textColor: '#000000'},
                        //     {text: 'Fuchsia badge', color: '#FF00FF', textColor: '#000000'}
                        // ]
                    }
                },
            },
            data2: {
                type: 'json',
            }
        },
        icon: 'pets'
    },
};

const config: AdminpanelConfig = {
    routePrefix: routePrefix,
    // routePrefix: "/admin",
    // auth: true,
    // registration: {
    //     enable: true,
    //     defaultUserGroup: "test",
    //     confirmationRequired: false
    // },
    dashboard: false,
    forms: {
        data: {
            global: {
                field1: {
                    title: 'Field1',
                    type: 'string',
                    value: 'Some string',
                    required: true,
                },
                field2: {
                    title: 'Field2',
                    type: 'text',
                    value: 'Some text',
                    required: true,
                    tooltip: 'tooltip for field2',
                },
                json: {
                    title: 'Json',
                    type: 'jsoneditor'
                },
            }
        }
    },
    navbar: {
        additionalLinks: [
            {
                id: '1',
                link: `${routePrefix}/form/global`,
                title: 'Global Settings',
                type: 'self',
                icon: 'build',
                accessRightsToken: 'read-global-form'
            },
            {
                id: '2',
                link: `${routePrefix}/module-test`,
                type: 'self',
                title: 'Test Module',
                icon: '360',
                accessRightsToken: 'read-global-form'
            }
        ]
    },
    sections: [
        {
            id: "0",
            title: 'Website 1',
            link: '#',
            type: 'self',
            icon: 'circle',
            subItems: [
                {
                    id: "0",
                    title: 'Sub 1',
                    type: 'blank',
                    link: 'https://example.com',
                    icon: 'language'
                },
                {
                    id: "1",
                    title: 'Sub 2',
                    link: 'https://google.com',
                    type: 'blank',
                    icon: 'share'
                },
                {
                    id: "2",
                    title: 'Sub 3 Sub 3 Sub 3 Sub 3',
                    link: `${routePrefix}/form/global`,
                    type: 'self',
                    icon: 'insert_link'
                },
                {
                    id: "3",
                    title: 'Sub 4',
                    link: 'https://google.com',
                    type: 'blank',
                    icon: 'insert_link'
                }
            ]
        },
        {
            id: "1",
            title: 'Website 2 Website 2 Website 2',
            link: 'https://example.com',
            type: 'blank',
            icon: 'insert_link'
        },
        {
            id: "2",
            title: 'Website 3',
            type: 'blank',
            link: 'https://example.com',
            icon: 'share'
        },
        {
            id: "3",
            title: 'Website 1',
            type: 'blank',
            link: 'https://example.com',
            icon: 'language'
        },
        {
            id: "4",
            title: 'Website 2 Website 2 Website 2',
            type: 'blank',
            link: 'https://example.com',
            icon: 'insert_link'
        },
    ],
    brand: {
        link: {
            id: "0",
            type: 'blank',
            title: 'Demo adminpanel',
            link: 'https://example.com',
        }
    },
    welcome: {
        title: 'Demo adminpanel project',
        text: 'restaurant and delivery food solution www.example.com'
    },
    administrator: {
        login: process.env.ADMIN_LOGIN === undefined ? 'admin' : process.env.ADMIN_LOGIN,
        password: process.env.ADMIN_PASS === undefined ? '45345345FF38' : process.env.ADMIN_PASS
    },
    translation: {
        locales: ['en', 'ru', 'de', 'ua'],
        path: 'config/locales', // relative path to translations directory
        defaultLocale: 'en'
    },
    models: models,
    //@ts-ignore
    generator: {},
    globalSettings: { // Global project settings
        enableMigrations: true
    },
    migrations: {
        path: 'mg_path', // path to migrations
        //config: string | object // db-migrate config
    },
    showVersion: true,
    auth: {
      enable: true,
      description: "Login `demo`, password `demo`"
    },
};

export default config
