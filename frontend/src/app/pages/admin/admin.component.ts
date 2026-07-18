import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GraphqlService } from '../../services/graphql.service';
import { AuthService } from '../../services/auth.service';
import { FeaturesService } from '../../services/features.service';

interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: { nombre: string };
}

// HU-S2.5 · Panel de Administración Académico (exclusivo rol ADMIN)
// El panel es una COMMONALITY (siempre presente), así que NO importa
// estáticamente los servicios de assets opcionales (materia/inscripcion):
// esos archivos se podan del producto si el asset no está incluido. En su
// lugar consulta los contadores por GraphQL directo, guardado por toggle.
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  private gql = inject(GraphqlService);
  private authService = inject(AuthService);
  private featuresService = inject(FeaturesService);

  usuarios = signal<UsuarioAdmin[]>([]);
  totalMaterias = signal(0);
  totalInscripciones = signal(0);
  error = signal<string | null>(null);

  adminNombre = () => this.authService.currentUser()?.nombre ?? 'Administrador';

  hasMaterias(): boolean { return this.featuresService.isEnabled('CA-016_ModuloMaterias'); }
  hasInscripciones(): boolean { return this.featuresService.isEnabled('CA-017_ModuloInscripciones'); }
  hasAuditoria(): boolean { return this.featuresService.isEnabled('CA-012_ModeloAuditoria'); }

  ngOnInit() {
    this.featuresService.cargar();

    this.gql.request<{ usuarios: UsuarioAdmin[] }>(`query { usuarios { id nombre email rol { nombre } } }`)
      .subscribe({
        next: d => this.usuarios.set(d.usuarios),
        error: err => this.error.set(err.message)
      });

    // Contadores de módulos opcionales: se consultan por GraphQL directo.
    // Si el módulo no está activo, el backend no expone el campo y la
    // petición falla en silencio (el contador queda en 0). No hay import
    // estático de sus servicios, así que el panel compila aunque el asset
    // haya sido podado del producto.
    this.gql.request<{ materias: { id: string }[] }>(`query { materias { id } }`)
      .subscribe({ next: d => this.totalMaterias.set(d.materias.length), error: () => {} });
    this.gql.request<{ inscripciones: { id: string }[] }>(`query { inscripciones { id } }`)
      .subscribe({ next: d => this.totalInscripciones.set(d.inscripciones.length), error: () => {} });
  }

  contarPorRol(rol: string): number {
    return this.usuarios().filter(u => u.rol?.nombre === rol).length;
  }
}
