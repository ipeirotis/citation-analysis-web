function sorto(o1, o2) {
    if(o1.name > o2.name) {
        return 1;
    }
    if(o1.name < o2.name) {
        return -1;
    }
    return 0;
}

angular.module('datamgmt.controllers', ['angucomplete-alt'])
    .controller('IntroController', function($scope, $location){
      var notification = new Noty({
          type: 'info',
          layout: 'topRight',
          text: 'Welcome to the Citation Tracker!',
          timeout: 6500
      }).show()
    })
    .controller('RootOrganizationListCtrl', function($scope, $location,
        Organization, RootOrganization, $timeout) {

        $scope.resultsPerPage = 10;
        $scope.currentPage = 1;

        $scope.query = function() {
            RootOrganization.get({
                    per_page: $scope.resultsPerPage,
                    page: $scope.currentPage
                })
                .$promise.then(function(result) {
                    $scope.organizations = result.roots;
                    $scope.totalPages = result.total_pages;
                    $scope.totalResults = result.total;
                });
        };

        $timeout(function() {
            $scope.query();
        }, 2000);

        $scope.nextPage = function() {
            if($scope.currentPage < $scope.totalPages) {
                $scope.currentPage = $scope.currentPage + 1;
            }
            $scope.query();
        };

        $scope.previousPage = function() {
            if($scope.currentPage > 1) {
                $scope.currentPage = $scope.currentPage - 1;
            }
            $scope.query();
        };

        $scope.deleteOrganization = function(id) {
            Organization.delete({
                    id: id
                })
                .$promise.then(function(result) {
                    $scope.totalResults = $scope.totalResults - 1;
                    if($scope.totalResults == 0) {
                        $scope.currentPage = 1;
                    }
                    $scope.query();
                });
        };

        $scope.editOrganization = function(id) {
            $location.path('/organization/' + id + '/edit');
        };

        $scope.createOrganization = function() {
            $location.path('/organization/new');
        };

        $scope.viewOrganizationTree = function(id) {
            $location.path('/organization/' + id + '/tree');
        };

        $scope.viewAuthors = function(id) {
            $location.path('/organization/' + id + '/authors');
        };

        $scope.query();

    })

    .controller('OrganizationAuthorsCtrl', function($scope, $location,
        Organization, OrganizationAuthors, $timeout, $routeParams) {

          $scope.resultsPerPage = 10;
          $scope.currentPage = 1;


          $timeout(function() {
              $scope.query();
          }, 2000);

        $scope.nextPage = function() {
            if($scope.currentPage < $scope.totalPages) {
                $scope.currentPage = $scope.currentPage + 1;
            }
            $scope.query();
        };

        $scope.previousPage = function() {
            if($scope.currentPage > 1) {
                $scope.currentPage = $scope.currentPage - 1;
            }
            $scope.query();
        };


        $scope.query = function(){
            Organization.query({
                    q: angular.toJson({
                        "filters": [{
                            "name": "id",
                            "op": "eq",
                            "val": $routeParams.id
        }]
                    })
                })
                .$promise.then(function(result) {
                    $scope.organization = result.data.objects[0];
                    OrganizationAuthors.get({
                            per_page: $scope.resultsPerPage,
                            page: $scope.currentPage,
                            id: $routeParams.id
                      })
                      .$promise.then(function(result) {
                         $scope.authors = result.authors;
                      });
                });
        };

        $timeout(function() {
            $scope.query();
        }, 2000);

        $scope.deleteAuthor = function(id) {
            Author.delete({
                    id: id
                })
                .$promise.then(function(result) {
                    $scope.query();
                });
        };

        $scope.editAuthor = function(id) {
            $location.path('/author/' + id + '/edit');
        };

        $scope.createAuthor = function() {
            $location.path('/author/new');
        };

        $scope.query();

    })
    .controller('OrganizationTreeCtrl', function($scope, $location,
        Organization, OrganizationTree, $timeout, $routeParams) {

        $scope.query = function() {

            Organization.query({
                    q: angular.toJson({
                        "filters": [{
                            "name": "id",
                            "op": "eq",
                            "val": $routeParams.id
        }]
                    })
                })
                .$promise.then(function(result) {
                    $scope.organization = result.data.objects[0];
                    OrganizationTree.get({
                            id: $routeParams.id
                        })
                        .$promise.then(function(result) {
                            $scope.tree = result.tree;
                        });
                });
        };

        $timeout(function() {
            $scope.query();
        }, 2000);

        $scope.deleteOrganization = function(id) {
            Organization.delete({
                    id: id
                })
                .$promise.then(function(result) {
                    $scope.query();
                });
        };

        $scope.editOrganization = function(id) {
            $location.path('/organization/' + id + '/edit');
        };

        $scope.createOrganization = function() {
            $location.path('/organization/new');
        };

        $scope.addChildOrganization = function(id) {
            $location.path('/organization/' + id + '/new');
        };

        $scope.query();

    })
    .controller('OrganizationCreateCtrl', function($scope, $location,
        $routeParams, Organization) {

        var id = $routeParams.id;

        $scope.organization = new Organization();

        Organization.query({
                q: angular.toJson({
                    "filters": [{
                        "name": "parent",
                        "op": "is_null"
      }],
                    "order_by": [{
                        "field": "name",
                        "direction": "asc"
      }]
                })
            })
            .$promise.then(function(result) {
                $scope.organizations_1 = result.data.objects;
                if(id) {
                    $scope.organization.parent_id = id;
                    Organization.get({
                            id: $routeParams.id
                        })
                        .$promise.then(function(result) {
                            var ancestors = [result.id];
                            for(var i = 0; i < result.ancestor_ids.length; i++) {
                                ancestors.push(result.ancestor_ids[
                                    i]);
                            }
                            $scope.top = ancestors[ancestors.length -
                                1];
                            if(ancestors.length > 0) {
                                for(var i = 0; i < $scope.organizations_1
                                    .length; i++) {
                                    var organization_1 = $scope.organizations_1[
                                        i];
                                    if(organization_1.id ==
                                        ancestors[ancestors.length -
                                            1]) {
                                        $scope.organization_1 =
                                            organization_1;
                                    }
                                }
                            }
                            for(var i = ancestors.length - 1; i >=
                                0; i--) {
                                $scope.getChildren(ancestors[i],
                                    ancestors.length - i + 1, i >
                                    0 ? ancestors[i - 1] : null
                                );
                            }
                        });
                }
            });

        $scope.getChildren = function(id, level, pre) {
            if(!id) {
                $scope['organizations_' + level] = null;
                return;
            }
            for(var i = level + 1; i <= 4; i++) {
                $scope['organizations_' + i] = null;
            }
            Organization.query({
                    q: angular.toJson({
                        "filters": [{
                            "name": "parent_id",
                            "op": "eq",
                            "val": id
        }],
                        "order_by": [{
                            "field": "name",
                            "direction": "asc"
        }]
                    })
                })
                .$promise.then(function(result) {
                    $scope['organizations_' + level] = result.data.objects;
                    if(pre) {
                        for(var i = 0; i < $scope['organizations_' +
                                level].length; i++) {
                            var organization = $scope[
                                'organizations_' + level][i];
                            if(organization.id == pre) {
                                $scope['organization_' + level] =
                                    organization;
                            }
                        }
                    }
                });
        };

        $scope.createOrganization = function() {
            Organization.save($scope.organization);
            $location.path('/organization/' + $scope.top + '/tree');
        };

        $scope.cancel = function() {
            $location.path('/organization');
        };

    })
    .controller('OrganizationEditCtrl', function($scope, $location,
        $routeParams, Organization) {

        $scope.updateOrganization = function(id) {
            Organization.update($scope.organization);
            $location.path('/organization');
        };

        Organization.query({
                q: angular.toJson({
                    "filters": [{
                        "name": "parent",
                        "op": "is_null"
      }],
                    "order_by": [{
                        "field": "name",
                        "direction": "asc"
      }]
                })
            })
            .$promise.then(function(result) {
                $scope.organizations_1 = result.data.objects;
                Organization.get({
                        id: $routeParams.id
                    })
                    .$promise.then(function(result) {
                        $scope.organization = result;
                        if(result.ancestor_ids.length > 0) {
                            for(var i = 0; i < $scope.organizations_1
                                .length; i++) {
                                var organization_1 = $scope.organizations_1[
                                    i];
                                if(organization_1.id == result.ancestor_ids[
                                        result.ancestor_ids.length -
                                        1]) {
                                    $scope.organization_1 =
                                        organization_1;
                                }
                            }
                        }
                        for(var i = result.ancestor_ids.length - 1; i >=
                            0; i--) {
                            $scope.getChildren(result.ancestor_ids[
                                    i], result.ancestor_ids.length -
                                i + 1, i > 0 ? result.ancestor_ids[
                                    i - 1] : null);
                        }
                    });
            });

        $scope.getChildren = function(id, level, pre) {
            if(!id) {
                $scope['organizations_' + level] = null;
                return;
            }
            for(var i = level + 1; i <= 4; i++) {
                $scope['organizations_' + i] = null;
            }
            Organization.query({
                    q: angular.toJson({
                        "filters": [{
                            "name": "parent_id",
                            "op": "eq",
                            "val": id
        }],
                        "order_by": [{
                            "field": "name",
                            "direction": "asc"
        }]
                    })
                })
                .$promise.then(function(result) {
                    $scope['organizations_' + level] = result.data.objects;
                    if(pre) {
                        for(var i = 0; i < $scope['organizations_' +
                                level].length; i++) {
                            var organization = $scope[
                                'organizations_' + level][i];
                            if(organization.id == pre) {
                                $scope['organization_' + level] =
                                    organization;
                            }
                        }
                    }
                });
        };

        $scope.editOrganization = function(id) {
            $location.path('/organization/' + id + '/edit');
        };

        $scope.cancel = function() {
            $location.path('/organization');
        };

    })
    .controller('AuthorListCtrl', function($scope, $location, Author, $timeout) {

        $scope.resultsPerPage = 10;
        $scope.currentPage = 1;

        $scope.query = function() {
            Author.query({
                    q: angular.toJson({
                        "filters": [{
                            "or": [{
                                "name": "retrieved_at",
                                "op": "is_not_null"
      }, {
                                "name": "scholar_id",
                                "op": "is_null"
            }]
          }],
                        "order_by": [{
                            "field": "name",
                            "direction": "asc"
      }]
                    }),
                    results_per_page: $scope.resultsPerPage,
                    page: $scope.currentPage
                })
                .$promise.then(function(result) {
                    $scope.authors = result.data.objects;
                    $scope.currentPage = result.data.page;
                    $scope.totalPages = result.data.total_pages;
                    $scope.numResults = result.data.num_results;
                });
        };

        $timeout(function() {
            $scope.query();
        }, 2000);

        $scope.nextPage = function() {
            if($scope.currentPage < $scope.totalPages) {
                $scope.currentPage = $scope.currentPage + 1;
            }
            $scope.query();
        };

        $scope.previousPage = function() {
            if($scope.currentPage > 1) {
                $scope.currentPage = $scope.currentPage - 1;
            }
            $scope.query();
        };

        $scope.deleteAuthor = function(id) {
            Author.delete({
                    id: id
                })
                .$promise.then(function(result) {
                    $scope.numResults = $scope.numResults - 1;
                    if($scope.numResults == 0) {
                        $scope.currentPage = 1;
                    }
                    $scope.query();
                })
        };

        $scope.editAuthor = function(id) {
            $location.path('/author/' + id + '/edit');
        };

        $scope.createAuthor = function() {
            $location.path('/author/new');
        };

        $scope.query();

    })
    .controller('AuthorCreateCtrl', function($scope, $location, $http, Author,
        Organization) {

        $scope.author = new Author();

        Organization.query({
                q: angular.toJson({
                    "filters": [{
                        "name": "parent",
                        "op": "is_null"
      }],
                    "order_by": [{
                        "field": "name",
                        "direction": "asc"
      }]
                })
            })
            .$promise.then(function(result) {
                $scope.organizations_1 = result.data.objects;
            });

        $scope.getChildren = function(id, level, pre) {
            if(!id) {
                $scope['organizations_' + level] = null;
                return;
            }
            for(var i = level + 1; i <= 4; i++) {
                $scope['organizations_' + i] = null;
            }
            Organization.query({
                    q: angular.toJson({
                        "filters": [{
                            "name": "parent_id",
                            "op": "eq",
                            "val": id
        }],
                        "order_by": [{
                            "field": "name",
                            "direction": "asc"
        }]
                    })
                })
                .$promise.then(function(result) {
                    $scope['organizations_' + level] = result.data.objects;
                    if(pre) {
                        for(var i = 0; i < $scope['organizations_' +
                                level].length; i++) {
                            var organization = $scope[
                                'organizations_' + level][i];
                            if(organization.id == pre) {
                                $scope['organization_' + level] =
                                    organization;
                            }
                        }
                    }
                });
        };

        $scope.createAuthor = function() {
            if($scope.author.scholar_id) {
                Author.query({
                        q: angular.toJson({
                            "filters": [{
                                "and": [{
                                    "name": "scholar_id",
                                    "op": "==",
                                    "val": $scope
                                        .author
                                        .scholar_id
            }, {
                                    "name": "retrieved_at",
                                    "op": "is_null"
            }]
      }]
                        })
                    })
                    .$promise.then(function(result) {
                        if(result.data.objects && result.data.objects
                            .length) {
                            var author = result.data.objects[0];
                            author.name = $scope.author.name;
                            author.title = $scope.author.title;
                            author.university_id = $scope.author.university_id;
                            author.department_id = $scope.author.department_id;
                            author.year_of_hd = $scope.author.year_of_phd;
                            author.tenured = $scope.author.tenured;
                            author.scholar_id = $scope.author.scholar_id;
                            Author.update(author);
                        } else {
                            Author.save($scope.author);
                        }
                        Author.query({
                            q: angular.toJson({
                                "filters": [{
                                    "name": "scholar_id",
                                    "op": "==",
                                    "val": $scope
                                        .author
                                        .scholar_id
            }],
                                "single": true
                            })
                        });
                        $location.path('/author');
                    });
            } else {
                Author.save($scope.author);
                $location.path('/author');
            }
        };

        $scope.cancel = function() {
            $location.path('/author');
        };

    })
    .controller('AuthorEditCtrl', function($scope, $location, $routeParams,
        Author, Organization) {

        $scope.updateAuthor = function(id) {
            /* This assumes that this info must be auto-updated */
            $scope.author.auto_org_assignment = false;
            Author.update($scope.author);
            $location.path('/author');
        };

        Organization.query({
                q: angular.toJson({
                    "filters": [{
                        "name": "parent",
                        "op": "is_null"
      }],
                    "order_by": [{
                        "field": "name",
                        "direction": "asc"
      }]
                })
            })
            .$promise.then(function(result) {
                $scope.organizations_1 = result.data.objects;
                Author.get({
                        id: $routeParams.id
                    })
                    .$promise.then(function(result) {
                        $scope.author = result;
                        if(result.organization_ids.length > 0) {
                            for(var i = 0; i < $scope.organizations_1
                                .length; i++) {
                                var organization_1 = $scope.organizations_1[
                                    i];
                                if(organization_1.id == result.organization_ids[
                                        0]) {
                                    $scope.organization_1 =
                                        organization_1;
                                }
                            }
                        }
                        for(var i = 0; i < result.organization_ids.length; i++) {
                            $scope.getChildren(result.organization_ids[
                                    i], i + 2, i < result.organization_ids
                                .length - 1 ? result.organization_ids[
                                    i + 1] : null);
                        }
                    });
            });

        $scope.getChildren = function(id, level, pre) {
            if(!id) {
                $scope['organizations_' + level] = null;
                return;
            }
            for(var i = level + 1; i <= 4; i++) {
                $scope['organizations_' + i] = null;
            }
            Organization.query({
                    q: angular.toJson({
                        "filters": [{
                            "name": "parent_id",
                            "op": "eq",
                            "val": id
        }],
                        "order_by": [{
                            "field": "name",
                            "direction": "asc"
        }]
                    })
                })
                .$promise.then(function(result) {
                    $scope['organizations_' + level] = result.data.objects;
                    if(pre) {
                        for(var i = 0; i < $scope['organizations_' +
                                level].length; i++) {
                            var organization = $scope[
                                'organizations_' + level][i];
                            if(organization.id == pre) {
                                $scope['organization_' + level] =
                                    organization;
                            }
                        }
                    }
                });
        };

        $scope.cancel = function() {
            $location.path('/author');
        };

    })
    .controller('PublicBenchmarkListCtrl', function($scope, $location,
        Benchmark, $timeout, $http) {

        var n = new Noty({
          text: "Please wait while we're fetching benchmarks/authors",
          timeout: 10000,
          type: 'warning'
        }).show()

        function fillAuthorsCount() {
            return $http.get('/api/benchmarks/countall')
                .then(function success(response) {
                    $scope.benchmarks_count = response.data.counts;
                }, function error(response) {

                });
        }
        fillAuthorsCount().then(function(){
          if($scope.benchmarks)
            $scope.benchmarks.forEach(fillBenchmarkCount);
        });
        function fillBenchmarkCount(b){
          if($scope.benchmarks_count){
            try{
              b.count = $scope.benchmarks_count
                          .find(x => (x.name == b.name)).count
            }catch(err){
            }
          }
        }
        $scope.resultsPerPage = 10;
        $scope.currentPage = 1;

        $scope.query = function() {
            Benchmark.query({
                    q: angular.toJson({
                        "filters": [],
                        "order_by": [{
                            "field": "name",
                            "direction": "asc"
      }]
                    }),
                    results_per_page: $scope.resultsPerPage,
                    page: $scope.currentPage
                })
                .$promise.then(function(result) {
                    $scope.benchmarks = result.data.objects;
                    $scope.benchmarks.forEach(fillBenchmarkCount);
                    $scope.currentPage = result.data.page;
                    $scope.totalPages = result.data.total_pages;
                    $scope.numResults = result.data.num_results;
                    n.setText('Done!');
                    n.setType('success');
                });
        };

        $timeout(function() {
            $scope.query();
        }, 500);

        $scope.benchmarkQuantiles = function(id) {
            var search = {
              benchmark: id,
              hide: 1,
            };
            $location.path('/benchmark-quantiles').search(search);
        };

        $scope.benchmarkVsAuthor = function(id) {
            var search = {
              benchmark: id,
              hide: 1,
            };
            $location.path('/author-vs-benchmark').search(search);
        };

        $scope.listPeople = function(id) {
            $location.path('/benchmarks/' + id + '/authors');
        };

        $scope.suggest = function(id) {
            $location.path('/suggest/' + id).search(search);
        };

        $scope.nextPage = function() {
            if($scope.currentPage < $scope.totalPages) {
                $scope.currentPage = $scope.currentPage + 1;
            }
            $scope.query();
        };

        $scope.previousPage = function() {
            if($scope.currentPage > 1) {
                $scope.currentPage = $scope.currentPage - 1;
            }
            $scope.query();
        };
        $scope.query();

    })
    .controller('BenchmarkListCtrl', function($scope, $location, Benchmark,
        $timeout) {

        $scope.resultsPerPage = 10;
        $scope.currentPage = 1;

        $scope.query = function() {
            Benchmark.query({
                    q: angular.toJson({
                        "filters": [],
                        "order_by": [{
                            "field": "name",
                            "direction": "asc"
      }]
                    }),
                    results_per_page: $scope.resultsPerPage,
                    page: $scope.currentPage
                })
                .$promise.then(function(result) {
                    $scope.benchmarks = result.data.objects;
                    $scope.currentPage = result.data.page;
                    $scope.totalPages = result.data.total_pages;
                    $scope.numResults = result.data.num_results;
                });
        };

        $timeout(function() {
            $scope.query();
        }, 2000);

        $scope.nextPage = function() {
            if($scope.currentPage < $scope.totalPages) {
                $scope.currentPage = $scope.currentPage + 1;
            }
            $scope.query();
        };

        $scope.previousPage = function() {
            if($scope.currentPage > 1) {
                $scope.currentPage = $scope.currentPage - 1;
            }
            $scope.query();
        };

        $scope.deleteBenchmark = function(id) {
            Benchmark.delete({
                    id: id
                })
                .$promise.then(function(result) {
                    $scope.numResults = $scope.numResults - 1;
                    if($scope.numResults == 0) {
                        $scope.currentPage = 1;
                    }
                    $scope.query();
                })
        };

        $scope.editBenchmark = function(id) {
            $location.path('/benchmark/' + id + '/edit');
        };

        $scope.createBenchmark = function() {
            $location.path('/benchmark/new');
        };

        $scope.query();

    })
    .controller('BenchmarkCreateCtrl', function($scope, $location, $http,
        Benchmark, Query) {

        $scope.test = false;
        $scope.valid = false;

        $scope.benchmark = new Benchmark();

        $scope.createBenchmark = function() {
            Benchmark.save($scope.benchmark);
            $location.path('/benchmark');
        };

        $scope.cancel = function() {
            $location.path('/benchmark');
        };

        $scope.testQuery = function() {
            var query = $scope.benchmark.the_query;
            $scope.test = false;
            Query.test({
                    query: query
                })
                .$promise.then(function(result) {
                    $scope.test = true;
                    $scope.valid = result.is_valid;
                    $scope.rows = result.rows;
                });
        };

    })
    .controller('BenchmarkEditCtrl', function($scope, $location, $routeParams,
        Benchmark, Query) {

        $scope.test = false;
        $scope.valid = false;

        $scope.updateBenchmark = function(id) {
            Benchmark.update($scope.benchmark);
            $location.path('/benchmark');
        };

        Benchmark.get({
                id: $routeParams.id
            })
            .$promise.then(function(result) {
                $scope.benchmark = result;
            });

        $scope.cancel = function() {
            $location.path('/benchmark');
        };

        $scope.testQuery = function() {
            var query = $scope.benchmark.the_query;
            $scope.test = false;
            Query.test({
                    query: query
                })
                .$promise.then(function(result) {
                    $scope.test = true;
                    $scope.valid = result.is_valid;
                    $scope.rows = result.rows;
                });
        };
    })
    .controller('SuggestionCtrl', function($scope, $http, $location,
        $routeParams, $timeout, Author, Benchmark, Suggestion) {
        var benchmark = +$routeParams.id;

        $scope.suggestion = new Suggestion();
        $scope.suggestion.benchmark_id = benchmark;

        Benchmark.get({
            id: benchmark
        })
        .$promise.then(function(result){
            $scope.benchmark = result;
        })

        $scope.createSuggestion = function(){
          Suggestion.save($scope.suggestion);
          $location.path('/benchmarks/' + benchmark + '/authors');
        }


    })
    .controller('BenchmarkAuthorListCtrl', function($scope, $http, $location,
        $routeParams, $timeout, Author, Benchmark) {
        var benchmark = $routeParams.id;

        $scope.currentPage = $location.search()['page'] || 1;
        $scope.resultsPerPage = $location.search()['per_page'] || 15;

        Benchmark.get({
                id: benchmark,
            })
            .$promise.then(function(result) {
                $scope.benchmark = result;
            });
        $scope.query = function (){

            $http.get('/api/benchmark/' + benchmark  + '/list-authors?page=' +
                  $scope.currentPage + '&per_page=' + $scope.resultsPerPage)
              .then(function(result){
                  $scope.authors = result.data.authors;
                  $scope.totalPages = result.data.total_pages;
            });
        }

        $scope.suggest = function() {
            $location.path('/suggest/' + benchmark);
        };


        $timeout(function() {
            $scope.query();
        }, 2000);

        $scope.nextPage = function() {
            if($scope.currentPage < $scope.totalPages) {
                $scope.currentPage = $scope.currentPage + 1;
            }
            $scope.query();
        };

        $scope.previousPage = function() {
            if($scope.currentPage > 1) {
                $scope.currentPage = $scope.currentPage - 1;
            }
            $scope.query();
        };


    })
    .controller('AuthorVsBenchmarkCtrl', function($scope, $http, $location,
        $routeParams, $timeout, Author, Benchmark) {

        var search = $location.search();

        Benchmark.query({
                q: angular.toJson({
                    "filters": [],
                    "order_by": [{
                        "field": "name",
                        "direction": "asc"
      }]
                })
            })
            .$promise.then(function(result) {
                $scope.benchmarks = result.data.objects;
                if(search.benchmark) {
                    for(var i = 0; i < $scope.benchmarks.length; i++) {
                        var benchmark = $scope.benchmarks[i];
                        if(benchmark.id == search.benchmark) {
                            $scope.benchmark = benchmark;
                            $scope.benchmarkChanged();
                            break;
                        }
                    }
                    $scope.go();
                }
            });

        if(search.author) {
            Author.get({
                    id: search.author
                })
                .$promise.then(function(result) {
                    $scope.author = result;
                    if($scope.author) {
                        $scope.$broadcast(
                            'angucomplete-alt:changeInput',
                            'author', $scope.author.name + ' (' +
                            $scope.author.scholar_id + ')');
                        $scope.go();
                    }
                });
        }

        $scope.benchmarkChanged = function() {
            $location.search('benchmark', $scope.benchmark.id);
            $scope.error = null;
            $http.get('/api/benchmark/' + $scope.benchmark.id +
                    '/authors')
                .then(function success(response) {
                    $scope.count = response.data.count;
                }, function error(response) {
                    $scope.error = response.statusText;
                });
        };

        $scope.authorChanged = function(author) {
            $scope.author = author.originalObject;
            if($scope.author) {
                $location.search('author', $scope.author.id);
            }
            if($scope.author.organization.length == 0){
                $scope.txt = 'No assigned organization';
                $scope.dis = true;
                $scope.stl = {
                    'opacity': 0.5,
                    'font-weight': 600,
                    'color': 'darkred',
                };
            }else{
                $scope.txt = 'GO';
                $scope.dis = false;
                $scope.stl = {};
            }
        };

        $scope.go = function() {

            if(!$scope.benchmark) {
                return;
            }
            if(!$scope.author) {
                return;
            }

            $scope.plot1_src = null;
            $scope.plot2_src = null;

            $timeout(function() {
                $scope.plot1_src =
                    '/dashboard/benchmark-quantiles-and-author?benchmark=' +
                    $scope.benchmark.id + '&author=' + $scope.author
                    .id;
                $scope.plot2_src =
                    '/dashboard/author-rank-over-time?benchmark=' +
                    $scope.benchmark.id + '&author=' + $scope.author
                    .id;
            }, 500);
        };

    })
    .controller('AverageCareerRankingCtrl', function($scope, $http, $location,
        $routeParams, $timeout, Benchmark) {

        var search = $location.search();

        Benchmark.query({
                q: angular.toJson({
                    "filters": [],
                    "order_by": [{
                        "field": "name",
                        "direction": "asc"
      }]
                })
            })
            .$promise.then(function(result) {
                $scope.benchmarks = result.data.objects;
                if(search.benchmark) {
                    for(var i = 0; i < $scope.benchmarks.length; i++) {
                        var benchmark = $scope.benchmarks[i];
                        if(benchmark.id == search.benchmark) {
                            $scope.benchmark = benchmark;
                            $scope.benchmarkChanged();
                            break;
                        }
                    }
                    $scope.go();
                }
            });

        $scope.benchmarkChanged = function() {
            $location.search('benchmark', $scope.benchmark.id);
            $scope.error = null;
            $http.get('/api/benchmark/' + $scope.benchmark.id +
                    '/authors')
                .then(function success(response) {
                    $scope.count = response.data.count;
                }, function error(response) {
                    $scope.error = response.statusText;
                });
        };

        $scope.go = function() {

            if(!$scope.benchmark) {
                return;
            }

            $scope.average_ranks = null;
            $timeout(function() {
                $scope.error = null;
                $http.get(
                        '/dashboard/benchmark-average-ranks?benchmark=' +
                        $scope.benchmark.id)
                    .then(function success(response) {
                        $scope.average_ranks = response.data
                            .average_ranks;
                    }, function error(response) {
                        $scope.error = response.statusText;
                    });
            }, 500);
        };

    })
    .controller('BenchmarkQuantilesCtrl', function($scope, $http, $location,
        $routeParams, $timeout, Benchmark) {

        var search = $location.search();
        var n;
        if(!search || !search.benchmark)
          n = new Noty({ 
            text: "Please select a benchmark!",
            type: "info",
            timeout: 10000,
          }).show();
        Benchmark.query({
                q: angular.toJson({
                    "filters": [],
                    "order_by": [{
                        "field": "name",
                        "direction": "asc"
      }]
                })
            })
            .$promise.then(function(result) {
                $scope.benchmarks = result.data.objects;
                if(search.benchmark) {
                    for(var i = 0; i < $scope.benchmarks.length; i++) {
                        var benchmark = $scope.benchmarks[i];
                        if(benchmark.id == search.benchmark) {
                            $scope.benchmark = benchmark;
                            $scope.benchmarkChanged();
                            break;
                        }
                    }
                    $scope.go();
                }
            });

        $scope.benchmarkChanged = function() {
            n = new Noty({
              text: 'Working with benchmark ' + $scope.benchmark.name,
              timeout: 4000,
              type: 'info',
            }).show();
            $location.search('benchmark', $scope.benchmark.id);
            $scope.error = null;
            $http.get('/api/benchmark/' + $scope.benchmark.id +
                    '/authors')
                .then(function success(response) {
                    $scope.count = response.data.count;
                    $scope.go();
                }, function error(response) {
                    $scope.error = response.statusText;
                });
        };

        $scope.go = function() {

            if(!$scope.benchmark) {
                return;
            }

            $scope.plot1_src = null;
            $scope.plot2_src = null;
            $timeout(function() {
                $scope.plot1_src =
                    '/dashboard/benchmark-quantiles?benchmark=' +
                    $scope.benchmark.id + '&what=agebar';
                $scope.plot2_src =
                    '/dashboard/benchmark-quantiles?benchmark=' +
                    $scope.benchmark.id + '&logy=true&what=yearly';
                $scope.plot3_src =
                    '/dashboard/benchmark-quantiles?benchmark=' +
                    $scope.benchmark.id + '&logy=false&what=yearly';
                $scope.plot4_src =
                    '/dashboard/benchmark-quantiles?benchmark=' +
                    $scope.benchmark.id + '&logy=false&what=cumulative';
                $scope.plot5_src =
                    '/dashboard/benchmark-quantiles?benchmark=' +
                    $scope.benchmark.id + '&logy=true&what=cumulative';
            }, 500);

        };

    }).controller('CitationPercentilesCtrl', function($scope, $http, $location,
        $routeParams, $timeout, Author, Benchmark, $q) {

        $scope.enable_go = true;

        $scope.authorChanged = function(author) {
            if(author){
              $scope.res_authors = [];
              author = author.originalObject;
              console.log("Change Author", author);
              $location.search('profile', author.scholar_id);
              $location.search('author', author.name);
              $scope.author = {
                'name': author.name,
                'scholar_id': author.scholar_id,
                'affiliation': author.affiliation,
              }
              $scope.author_name = author.name;
              $scope.scholar_id = author.scholar_id;
              $scope.selectedObject = author;
              $scope.analyze();
            }
        };


        $scope.getAll = function(){
          return $scope.res_authors || [];
        }

        $scope.inputChanged = function(iC) {
          $location.search('profile', undefined);
          $location.search('author', undefined);
          $scope.author_name = iC;
        }
        $scope.current_promise = $q.defer();

        $scope.go_ = function (){
          if($scope.current_promise)
            $scope.current_promise.reject()
          $scope.current_promise = $q.defer()
          console.log("Promising", $scope.current_promise);
          return $scope.current_promise.promise;
        }

        $scope.clear_go = function (){
          console.log("Clearing");
          $scope.res_authors = [];
          $scope.author = null;
          $location.search('profile', undefined);
          $location.search('author', undefined);
          $scope.title = undefined;
          $scope.error = undefined;
          $scope.pubs = $scope.plots = undefined;
          $scope.enable_go = true;
          $scope.txt = "Go";
          if($scope.interv)
            clearInterval($scope.interv);
        }

        $scope.go = function() {
          var r = $scope.author_name + "     ";
          $scope.enable_go = false;
          $scope.txt = 'Loading... Please wait!';
          console.log('Pressed go', $scope.author_name);
          if($scope.author_name){

         } else {
            console.log('Pressed go without author!');
            $scope.enable_go = true;
            return;
          }
          // TODO disable go button
          $http.get('/dashboard/search_name?author=' + $scope.author_name)
            .then(function success (response) {
              var noty;
              response = response.data;
              console.log(response)
              if (response.results && response.results.length == 0){
                noty = new Noty ({
                  type: 'warning',
                  layout: 'topRight',
                  text: 'No author found! Type another name and press "go"!',
                  timeout: 30*1000,
                }).show();
              	$scope.enable_go = true;
              } else if (response.results.length == 1){
                  noty = new Noty ({
                  type: 'info',
                  layout: 'topRight',
                  text: `Found ${response.results[0].name}, running the analysis!`,
                  timeout: 30*1000,
                }).show();
                $location.search('profile', response.results[0].scholar_id);
                $location.search('author', response.results[0].name);
                $scope.scholar_id = response.results[0].scholar_id;
                $scope.selectedObject = response.results[0];
                $scope.author = response.results[0];
                $scope.analyze();
              } else if (response.results.length > 1){
                $scope.current_promise.resolve(response.results);
                $scope.res_authors = response.results;

                var el = document.querySelector('input[type="text"]');
                triggerEvent(el, 'keyup');
                triggerEvent(el, 'keyup');
                noty = new Noty ({
                  type: 'info',
                  layout: 'topRight',
                  text: `Found ${response.results.length} authors, please select one`,
                  timeout: 30*1000,
                }).show();
              }
              $scope.txt = 'GO';
            }, function fail (error) {
              $scope.error = "Internal Server Error - Please try again later";
              $scope.enable_go = true;
              $scope.txt = 'GO';
              console.log('failure', error)
            });
        };

        $scope.analyze = function() {
          $scope.enable_go = false;
          $scope.error = undefined;
          $scope.pubs = $scope.plots = $scope.title = undefined;
            if(!$scope.author) {
                return;
            }

            function run_analysis(){
              $http.get('/dashboard/citations_percentiles_author_report?profile=' + $scope.author.scholar_id)
                .then(function success(response) {
                    var notification;
                    $scope.pubs = response.data.pubs;
                    $scope.plots = response.data.plots;
                    $scope.title = response.data.title;
                    $timeout(function(){
                      bind_magnific(".img-responsive");
                    }, 500);
                    if(response['error']){
                      $scope.error = response.error;
                      notification.hide();
                      notification = new Noty({
                        type: 'error',
                        layout: 'topRight',
                        text: 'Error Occurred! ' + response.error,
                        timeout: 120000
                      });
                    } else {
                      if (notification)
                        notification.close();
                    }
                    $scope.enable_go = true;

                    $scope.$broadcast('angucomplete-alt:clearInput', 'author-112');
                    $scope.typed_name = null;
                }, function error(response) {
                    $scope.error = response.statusText;
                    $scope.enable_go = true;
                    $scope.typed_name = null;
                    $scope.$broadcast('angucomplete-alt:clearInput', 'author-112');
                });
            }
            var i=0;
            $scope.interv = setInterval(function(){

              var notification = new Noty({
                type: 'info',
                layout: 'topRight',
                text: 'Compiling Information',
                timeout: 15000
              }).show();

              $http.get('/dashboard/search_scholarid?author=' + $scope.author_name + "&profile=" + $scope.scholar_id )
                .then(function(response){
                  if(response.data.msg == "Success"){
                    clearInterval($scope.interv);
                    console.log("running analysis");
                    run_analysis();
                  }
                  else{
                    notification.close();
                    i++;
                    notification = new Noty({
                      type: 'warning',
                      layout: 'topRight',
                      text: `We are currently fetching the information. Please wait, or come back later (Poll ${i})`,
                      timeout: 5000
                    }).show();
                  }
                })
          }, 7000)
        };

        var search = $location.search();

        if(search.profile) {
          $http.get('/dashboard/search_scholarid?&profile='+ search.profile)
            .then(function(response){
              if(response.data.msg == "Success"){
                $scope.author = {
                  'scholar_id': response.data.author.id,
                  'name': response.data.author.name,
                  'affiliation': response.data.author.affiliation,
                }
                $scope.analyze();
              } else {
                $scope.go();
                $scope.enable_go = true;
                $scope.txt = "Go";
              }
              $scope.scholar_id = response.data.author.id;
              $scope.typed_name = response.data.author.name;
              $scope.author_name= response.data.author.name;
            })
        }
    })

function triggerEvent(el, type){
  if ('createEvent' in document) {
    // modern browsers, IE9+
    var e = document.createEvent('HTMLEvents');
    e.initEvent(type, false, true);
    el.dispatchEvent(e);
  } else {
    // IE 8
    var e = document.createEventObject();
    e.eventType = type;
    el.fireEvent('on'+e.eventType, e);
  }

}

function bind_magnific(classes){
  $(classes).magnificPopup({
        type: 'image',
        closeOnContentClick: true,
        mainClass: 'mfp-img-mobile',
        image: {
          verticalFit: true
        },
        callbacks: {
          elementParse: function(item) {item.src = item.el.attr('src');}
        }
      });
}

