import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Action } from 'app/types/Authorization';
import { UserToken } from 'app/types/User';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { RouteGuardService } from '../guard/route-guard';
import { AuthorizationService } from '../services/authorization.service';
import { CentralServerNotificationService } from '../services/central-server-notification.service';
import { CentralServerService } from '../services/central-server.service';
import { ConfigService } from '../services/config.service';
import { Constants } from '../utils/Constants';

declare const $: any;

const misc: any = {
  navbar_menu_visible: 0,
  active_collapse: true,
  disabled_collapse_init: 0,
};

@Component({
  selector: 'app-sidebar-cmp',
  templateUrl: 'sidebar.component.html',
})
export class SidebarComponent implements OnInit, OnDestroy {
  public mobileMenuVisible: any = 0;
  public menuItems!: any[];
  public loggedUser!: UserToken;
  public loggedUserImage = Constants.USER_NO_PICTURE;
  public isAdmin = false;
  public canEditProfile = false;
  private toggleButton: HTMLElement;
  private userRefreshSubscription!: Subscription;

  constructor(
    private configService: ConfigService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private guard: RouteGuardService,
    private authorizationService: AuthorizationService,
    private centralServerService: CentralServerService,
    private centralServerNotificationService: CentralServerNotificationService) {
    // Get the routes
    if (this.activatedRoute && this.activatedRoute.routeConfig && this.activatedRoute.routeConfig.children) {
      this.menuItems = this.activatedRoute.routeConfig.children.filter((route) => {
        return route.data && route.data.menu && this.guard.isRouteAllowed(route) && this.guard.canLoad(route, []);
      }).map((route) => route && route.data ? route.data.menu : null);
    }

    // Set admin
    this.isAdmin = this.authorizationService.isAdmin() || this.authorizationService.isSuperAdmin();
    // Get the logged user
    this.centralServerService.getCurrentUserSubject().subscribe((user) => {
      this.loggedUser = user;
    });

    if (authorizationService.canUpdateUser()) {
      this.canEditProfile = true;
    }
    // Read user
    this.refreshUser();
  }

  public ngOnInit() {
    this.createUserRefresh();
    this.toggleButton = document.getElementById('toggler');
  }

  public ngOnDestroy() {
    this.destroyUserRefresh();
  }

  private createUserRefresh() {
    if (this.configService.getCentralSystemServer().socketIOEnabled) {
      // Subscribe to user's change
      this.userRefreshSubscription = this.centralServerNotificationService.getSubjectUser().pipe(debounceTime(
        this.configService.getAdvanced().debounceTimeNotifMillis)).subscribe((singleChangeNotification) => {
          // Update user?
          if (singleChangeNotification && singleChangeNotification.data && singleChangeNotification.data.id === this.loggedUser.id) {
            // Deleted?
            if (singleChangeNotification.action === Action.DELETE) {
              // Log off user
              this.logout();
            } else {
              // Same user: Update it
              this.refreshUser();
            }
          }
        });
    }
  }

  private destroyUserRefresh() {
    if (this.userRefreshSubscription) {
      // Unsubscribe to user's change
      this.userRefreshSubscription.unsubscribe();
    }
    this.userRefreshSubscription = null;
  }

  private refreshUser() {
    // Get the user's image
    if (this.loggedUser && this.loggedUser.id) {
      this.centralServerService.getUserImage(this.loggedUser.id).subscribe((image) => {
        this.loggedUserImage = (image && image.image ? image.image : Constants.USER_NO_PICTURE).toString();
      });
    }
  }

  public isMobileMenu() {
    return false;
  }

  public updatePS(): void {
    if (window.matchMedia(`(min-width: 960px)`).matches && !this.isMac()) {
      const elemSidebar = document.querySelector('.sidebar .sidebar-wrapper') as HTMLElement;
    }
  }

  public isMac(): boolean {
    let bool = false;
    if (navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.platform.toUpperCase().indexOf('IPAD') >= 0) {
      bool = true;
    }
    return bool;
  }

  public toggleSidebar() {
    const body = document.getElementsByTagName('body')[0];

    if (misc.sidebar_mini_active === true) {
      body.classList.remove('sidebar-mini');
      misc.sidebar_mini_active = false;
    } else {
      body.classList.add('sidebar-mini');
      misc.sidebar_mini_active = true;
    }
  }

  private logout() {
    // Logoff
    this.centralServerService.logout().subscribe(() => {
      // Clear
      this.centralServerService.logoutSucceeded();
      // Redirect to login page with the return url
      this.router.navigate(['/auth/login']);
    }, (error) => {
      // Clear
      this.centralServerService.logoutSucceeded();
      // Redirect to login page with the return url
      this.router.navigate(['/auth/login']);
    });
  }
}
