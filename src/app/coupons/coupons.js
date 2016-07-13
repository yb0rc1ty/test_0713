angular.module( 'orderCloud' )

    .config( CouponsConfig )
    .controller( 'CouponsCtrl', CouponsController )
    .controller( 'CouponEditCtrl', CouponEditController )
    .controller( 'CouponCreateCtrl', CouponCreateController )
    .controller( 'CouponAssignCtrl', CouponAssignController )
    .controller( 'CouponAssignProductCtrl', CouponAssignProductController )
    .controller( 'CouponAssignCategoryCtrl', CouponAssignCategoryController )

;

function CouponsConfig( $stateProvider ) {
    $stateProvider
        .state( 'coupons', {
            parent: 'base',
            templateUrl: 'coupons/templates/coupons.tpl.html',
            controller: 'CouponsCtrl',
            controllerAs: 'coupons',
            url: '/coupons?search&page&pageSize',
            data: {componentName : 'Coupons'},
            resolve: {
                Parameters: function ( $stateParams, OrderCloudParameters){
                    return OrderCloudParameters.Get($stateParams);
                },
                CouponList: function(OrderCloud, Parameters){
                    return OrderCloud.Coupons.List(Parameters.search, Parameters.page, Parameters.pageSize || 12);
                }
            }
        })
        .state( 'coupons.edit', {
            url: '/:couponid/edit',
            templateUrl:'coupons/templates/couponEdit.tpl.html',
            controller:'CouponEditCtrl',
            controllerAs: 'couponEdit',
            resolve: {
                SelectedCoupon: function($q, $stateParams, OrderCloud) {
                    var d = $q.defer();
                    OrderCloud.Coupons.Get($stateParams.couponid)
                        .then(function(coupon) {
                            if(coupon.StartDate != null)
                                coupon.StartDate = new Date(coupon.StartDate);
                            if(coupon.ExpirationDate != null)
                                coupon.ExpirationDate = new Date(coupon.ExpirationDate);
                            d.resolve(coupon);
                        });
                    return d.promise;
                }
            }
        })
        .state( 'coupons.create', {
            url: '/create',
            templateUrl: 'coupons/templates/couponCreate.tpl.html',
            controller: 'CouponCreateCtrl',
            controllerAs: 'couponCreate'
        })
        .state( 'coupons.assignParty', {
            url: '/:couponid/assign/party',
            templateUrl: 'coupons/templates/couponAssignParty.tpl.html',
            controller: 'CouponAssignCtrl',
            controllerAs: 'couponAssign',
            resolve: {
                Buyer: function(OrderCloud) {
                    return OrderCloud.Buyers.Get();
                },
                UserGroupList: function(OrderCloud) {
                    return OrderCloud.UserGroups.List(null, 1, 20);
                },
                AssignedUserGroups: function($stateParams, OrderCloud) {
                    return OrderCloud.Coupons.ListAssignments($stateParams.couponid);
                },
                SelectedCoupon: function($stateParams, OrderCloud) {
                    return OrderCloud.Coupons.Get($stateParams.couponid);
                }
            }
        })
        .state( 'coupons.assignProduct', {
            url: '/:couponid/assign/product',
            templateUrl: 'coupons/templates/couponAssignProduct.tpl.html',
            controller: 'CouponAssignProductCtrl',
            controllerAs: 'couponAssignProd',
            resolve: {
                ProductList: function(OrderCloud) {
                    return OrderCloud.Products.List();
                },
                ProductAssignments: function($stateParams, OrderCloud) {
                    return OrderCloud.Coupons.ListProductAssignments($stateParams.couponid);
                },
                SelectedCoupon: function($stateParams, OrderCloud) {
                    return OrderCloud.Coupons.Get($stateParams.couponid);
                }
            }
        })
        .state( 'coupons.assignCategory', {
            url: '/:couponid/assign/category',
            templateUrl: 'coupons/templates/couponAssignCategory.tpl.html',
            controller: 'CouponAssignCategoryCtrl',
            controllerAs: 'couponAssignCat',
            resolve: {
                CategoryList: function(OrderCloud) {
                    return OrderCloud.Categories.List();
                },
                CategoryAssignments: function($stateParams, OrderCloud) {
                    return OrderCloud.Coupons.ListCategoryAssignments($stateParams.couponid);
                },
                SelectedCoupon: function($stateParams, OrderCloud) {
                    return OrderCloud.Coupons.Get($stateParams.couponid);
                }
            }
        });
}

function CouponsController( CouponList, OrderCloud, Parameters, OrderCloudParameters, $ocMedia, $state) {
    var vm = this;
    vm.list = CouponList;
    vm.parameters = Parameters;
    vm.sortSelection = Parameters.sortBy ? (Parameters.sortBy.indexOf('!') == 0 ? Parameters.sortBy.split('!')[1] : Parameters.sortBy) : null;

    //Check if filters are applied
    vm.filtersApplied = vm.parameters.filters || ($ocMedia('max-width:767px') && vm.sortSelection); //Sort by is a filter on mobile devices
    vm.showFilters = vm.filtersApplied;

    //Check if search was used
    vm.searchResults = Parameters.search && Parameters.search.length > 0;

    //Reload the state with new parameters
    vm.filter = function(resetPage) {
        $state.go('.', OrderCloudParameters.Create(vm.parameters, resetPage));
    };

    //Reload the state with new search parameter & reset the page
    vm.search = function() {
        vm.filter(true);
    };

    //Clear the search parameter, reload the state & reset the page
    vm.clearSearch = function() {
        vm.parameters.search = null;
        vm.filter(true);
    };

    //Clear relevant filters, reload the state & reset the page
    vm.clearFilters = function() {
        vm.parameters.filters = null;
        $ocMedia('max-width:767px') ? vm.parameters.sortBy = null : angular.noop(); //Clear out sort by on mobile devices
        vm.filter(true);
    };

    //Conditionally set, reverse, remove the sortBy parameter & reload the state
    vm.updateSort = function(value) {
        value ? angular.noop() : value = vm.sortSelection;
        switch(vm.parameters.sortBy) {
            case value:
                vm.parameters.sortBy = '!' + value;
                break;
            case '!' + value:
                vm.parameters.sortBy = null;
                break;
            default:
                vm.parameters.sortBy = value;
        }
        vm.filter(false);
    };

    //Used on mobile devices
    vm.reverseSort = function() {
        Parameters.sortBy.indexOf('!') == 0 ? vm.parameters.sortBy = Parameters.sortBy.split('!')[1] : vm.parameters.sortBy = '!' + Parameters.sortBy;
        vm.filter(false);
    };

    //Reload the state with the incremented page parameter
    vm.pageChanged = function() {
        $state.go('.', {page:vm.list.Meta.Page});
    };

    //Load the next page of results with all of the same parameters
    vm.loadMore = function() {
        return OrderCloud.Coupons.List( Parameters.search, vm.list.Meta.Page + 1, Parameters.pageSize || vm.list.Meta.PageSize, Parameters.searchOn, Parameters.sortBy, Parameters.filters)
            .then(function(data) {
                vm.list.Items = vm.list.Items.concat(data.Items);
                vm.list.Meta = data.Meta;
            });
    };
}

function CouponEditController( $exceptionHandler, $state, SelectedCoupon, OrderCloud, toastr ) {
    var vm = this,
        couponid = SelectedCoupon.ID;
    vm.couponName = SelectedCoupon.Label;
    vm.coupon = SelectedCoupon;

    vm.Submit = function() {
        OrderCloud.Coupons.Update(couponid, vm.coupon)
            .then(function() {
                $state.go('coupons', {}, {reload:true});
                toastr.success('Coupon Updated', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    };

    vm.Delete = function() {
        OrderCloud.Coupons.Delete(SelectedCoupon.ID)
            .then(function() {
                $state.go('coupons', {}, {reload:true});
                toastr.success('Coupon Deleted', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }
}

function CouponCreateController( $exceptionHandler, $state, OrderCloud, toastr) {
    var vm = this;
    vm.coupon = {};
    vm.coupon.MinimumPurchase = 0;

    vm.GenerateCode = function(bits) {
        bits = typeof  bits !== 'undefined' ? bits : 16;
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var code = "";
        for (var i = 0; i < bits; i += 1) {
            code += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return code;
    };

    vm.Submit = function() {
        OrderCloud.Coupons.Create(vm.coupon)
            .then(function() {
                $state.go('coupons', {}, {reload:true});
                toastr.success('Coupon Created', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }
}

function CouponAssignController($scope, OrderCloud, Buyer, UserGroupList, AssignedUserGroups, SelectedCoupon, Assignments, Paging, toastr) {
    var vm = this;
    vm.coupon = SelectedCoupon;
    vm.buyer = Buyer;
    vm.list = UserGroupList;
    vm.assignments = AssignedUserGroups;
    vm.saveAssignments = saveAssignments;
    vm.pagingfunction = PagingFunction;

    $scope.$watchCollection(function(){
        return vm.list;
    }, function(){
        Paging.setSelected(vm.list.Items, vm.assignments.Items, 'UserGroupID')
    });

    function SaveFunc(ItemID) {
        return OrderCloud.Coupons.SaveAssignment({
            UserID: null,
            UserGroupID: ItemID,
            CouponID: vm.coupon.ID
        });
    }

    function DeleteFunc(ItemID) {
        return OrderCloud.Coupons.DeleteAssignment(vm.coupon.ID, null, ItemID);
    }

    function saveAssignments() {
        toastr.success('Assignment Updated', 'Success');
        return Assignments.saveAssignments(vm.list.Items, vm.assignments.Items, SaveFunc, DeleteFunc, 'UserGroupID');
    }

    function AssignmentFunc() {
        return OrderCloud.Coupons.ListAssignments(vm.coupon.ID, null, vm.assignments.Meta.Page + 1, vm.assignments.Meta.PageSize);
    }

    function PagingFunction() {
        return Paging.paging(vm.list, 'UserGroups', vm.assignments, AssignmentFunc);
    }
}

function CouponAssignProductController($scope, OrderCloud, ProductList, ProductAssignments, SelectedCoupon, Assignments, Paging, toastr) {
    var vm = this;
    vm.list = ProductList;
    vm.assignments = ProductAssignments;
    vm.coupon = SelectedCoupon;
    vm.saveAssignments = SaveAssignment;
    vm.pagingfunction = PagingFunction;

    $scope.$watchCollection(function(){
        return vm.list;
    }, function(){
        Paging.setSelected(vm.list.Items, vm.assignments.Items, 'ProductID')
    });

    function SaveFunc(ItemID) {
        return OrderCloud.Coupons.SaveProductAssignment({
            CouponID: vm.coupon.ID,
            ProductID: ItemID
        });
    }

    function DeleteFunc(ItemID) {
        return OrderCloud.Coupons.DeleteProductAssignment(vm.coupon.ID, ItemID);
    }

    function SaveAssignment() {
        toastr.success('Assignment Updated', 'Success');
        return Assignments.saveAssignments(vm.list.Items, vm.assignments.Items, SaveFunc, DeleteFunc, 'ProductID');
    }

    function AssignmentFunc() {
        return OrderCloud.Coupons.ListProductAssignments(vm.coupon.ID, null, vm.assignments.Meta.Page + 1, vm.assignments.Meta.PageSize);
    }

    function PagingFunction() {
        return Paging.paging(vm.list, 'Products', vm.assignments, AssignmentFunc);
    }
}

function CouponAssignCategoryController($scope, OrderCloud, CategoryList, CategoryAssignments, SelectedCoupon, Assignments, Paging, toastr) {
    var vm = this;
    vm.list = CategoryList;
    vm.assignments = CategoryAssignments;
    vm.coupon = SelectedCoupon;
    vm.saveAssignments = SaveAssignment;
    vm.pagingfunction = PagingFunction;

    $scope.$watchCollection(function(){
        return vm.list;
    }, function(){
        Paging.setSelected(vm.list.Items, vm.assignments.Items, 'CategoryID')
    });

    function SaveFunc(ItemID) {
        return OrderCloud.Coupons.SaveCategoryAssignment({
            CouponID: vm.coupon.ID,
            CategoryID: ItemID
        });
    }

    function DeleteFunc(ItemID) {
        return OrderCloud.Coupons.DeleteCategoryAssignment(vm.coupon.ID, ItemID);
    }

    function SaveAssignment() {
        toastr.success('Assignment Updated', 'Success');
        return Assignments.saveAssignments(vm.list.Items, vm.assignments.Items, SaveFunc, DeleteFunc, 'CategoryID');
    }

    function AssignmentFunc() {
        return OrderCloud.Coupons.ListCategoryAssignments(vm.coupon.ID, null, vm.assignments.Meta.Page + 1, vm.assignments.Meta.PageSize);
    }

    function PagingFunction() {
        return Paging.paging(vm.list, 'Categories', vm.assignments, AssignmentFunc);
    }
}
