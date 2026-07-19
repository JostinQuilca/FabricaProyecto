import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FeaturesService } from '../../services/features.service';
import { Usuario, Role } from '../../models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  user: Usuario | null = null;

  // Expose Role enum to template
  Role = Role;

  constructor(
    private authService: AuthService,
    private featuresService: FeaturesService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.authService.currentUser();
    this.featuresService.cargar();
  }

  // Los módulos opcionales (Materias, Inscripciones, Auditoría) solo se
  // muestran si el Core Asset correspondiente está activo en este producto.
  hasMaterias(): boolean { return this.featuresService.isEnabled('CA-016_ModuloMaterias'); }
  hasInscripciones(): boolean { return this.featuresService.isEnabled('CA-017_ModuloInscripciones'); }
  hasAuditoria(): boolean { return this.featuresService.isEnabled('CA-012_ModeloAuditoria'); }
  hasCalificaciones(): boolean { return this.featuresService.isEnabled('CA-019_ModuloCalificaciones'); }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
