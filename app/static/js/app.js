var app = angular.module('datamgmt', ['ngResource', 'ngRoute',
    'datamgmt.controllers', 'datamgmt.services']);

app.config(function($routeProvider) {
    $routeProvider.when('/organization', {
            controller: 'RootOrganizationListCtrl',
            templateUrl: '/partials/organizations/list-root.html'
        })
        .when('/organization/:id/authors', {
            controller: 'OrganizationAuthorsCtrl',
            templateUrl: '/partials/organizations/list-authors.html'
        })
        .when('/organization/:id/tree', {
            controller: 'OrganizationTreeCtrl',
            templateUrl: '/partials/organizations/list-tree.html'
        })
        .when('/organization/new', {
            controller: 'OrganizationCreateCtrl',
            templateUrl: '/partials/organizations/create.html'
        })
        .when('/organization/:id/new', {
            controller: 'OrganizationCreateCtrl',
            templateUrl: '/partials/organizations/create.html'
        })
        .when('/organization/:id/edit', {
            controller: 'OrganizationEditCtrl',
            templateUrl: '/partials/organizations/edit.html'
        })
        .when('/author', {
            controller: 'AuthorListCtrl',
            templateUrl: '/partials/authors/list.html'
        })
        .when('/author/new', {
            controller: 'AuthorCreateCtrl',
            templateUrl: '/partials/authors/create.html'
        })
        .when('/author/:id/edit', {
            controller: 'AuthorEditCtrl',
            templateUrl: '/partials/authors/edit.html'
        })
        .when('/benchmark', {
            controller: 'BenchmarkListCtrl',
            templateUrl: '/partials/benchmarks/list.html'
        })
        .when('/benchmark/new', {
            controller: 'BenchmarkCreateCtrl',
            templateUrl: '/partials/benchmarks/create.html'
        })
        .when('/benchmark/:id/edit', {
            controller: 'BenchmarkEditCtrl',
            templateUrl: '/partials/benchmarks/edit.html'
        })
        .when('/benchmarks', {
            controller: 'PublicBenchmarkListCtrl',
            templateUrl: '/partials/benchmarks/public_list.html'
        })
        .when('/benchmarks/:id/authors', {
            controller: 'BenchmarkAuthorListCtrl',
            templateUrl: '/partials/authors/public_list.html'
        })
        .when('/suggest/:id/', {
            controller: 'SuggestionCtrl',
            templateUrl: '/partials/benchmarks/create_suggestion.html'
        })
        .when('/author-vs-benchmark', {
            controller: 'AuthorVsBenchmarkCtrl',
            templateUrl: '/partials/dashboard/author-vs-benchmark.html',
            reloadOnSearch: false
        })
        .when('/average-career-ranking', {
            controller: 'AverageCareerRankingCtrl',
            templateUrl: '/partials/dashboard/average-career-ranking.html',
            reloadOnSearch: false
        })
        .when('/benchmark-quantiles', {
            controller: 'BenchmarkQuantilesCtrl',
            templateUrl: '/partials/dashboard/benchmark-quantiles.html',
            reloadOnSearch: false
        })
        .when('/citation-percentiles', {
            controller: 'CitationPercentilesCtrl',
            templateUrl: '/partials/dashboard/citation-percentiles.html',
            reloadOnSearch: false
        }).when('/',{
            controller: 'IntroController',
            templateUrl: '/partials/welcome.html',
            reloadOnSearch: false,
        });
});

app.directive('imageonload', function() {
    return {
        restrict: 'A',
            link: function(scope, element, attrs) {
                var noty = new Noty({
                  text: "Calculating " + attrs.imageonload,
                  type: 'warning',
                }).show();
                element.bind('load', function() {
                    noty.setText(attrs.imageonload + ' Loaded!');
                    noty.setTimeout(3000);
                    noty.setType('success');
                    // scope.$apply(attrs.imageonload);
                });
                element.bind('error', function(){
                    noty.setText(attrs.imageonload + ' Failed to load');
                    noty.setType('error');
                    console.log('image could not be loaded');
                });
            }
    };
});
