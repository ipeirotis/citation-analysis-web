angular.module('datamgmt.services', [])
    .factory('Organization', function($resource) {
        return $resource('/api/organization/:id', {
            id: '@id'
        }, {
            query: {
                method: 'GET',
                isArray: false,
                interceptor: {
                    response: function(response) {
                        return response;
                    }
                }
            },
            update: {
                method: 'PUT'
            }
        });
    })
    .factory('RootOrganization', function($resource) {
        return $resource('/api/organization/root', {}, {
            get: {
                method: 'GET'
            }
        });
    })
    .factory('OrganizationTree', function($resource) {
        return $resource('/api/organization/:id/tree', {
            id: '@id'
        }, {
            get: {
                method: 'GET'
            }
        });
    })
    .factory('OrganizationAuthors', function($resource) {
        return $resource('/api/organization/:id/authors', {
            id: '@id'
        }, {
            get: {
                method: 'GET'
            }
        });
    })
    .factory('Author', function($resource) {
        return $resource('/api/author/:id', {
            id: '@id'
        }, {
            query: {
                method: 'GET',
                isArray: false,
                interceptor: {
                    response: function(response) {
                        return response;
                    }
                }
            },
            update: {
                method: 'PUT'
            }
        });
    })
    .factory('Suggestion', function($resource) {
        return $resource('/api/suggestions/:id', {
            id: '@id'
        }, {
            query: {
                method: 'GET',
                isArray: false,
                interceptor: {
                    response: function(response) {
                        return response;
                    }
                }
            },
            update: {
                method: 'PUT'
            }
        });
    })
    .factory('Benchmark', function($resource) {
        return $resource('/api/benchmark/:id', {
            id: '@id'
        }, {
            query: {
                method: 'GET',
                isArray: false,
                interceptor: {
                    response: function(response) {
                        return response;
                    }
                }
            },
            update: {
                method: 'PUT'
            }
        });
    })
    .factory('Query', function($resource) {
        return $resource('/api/benchmark/query/test', {}, {
            test: {
                method: 'POST'
            }
        });
    });
