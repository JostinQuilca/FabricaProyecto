import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GraphqlService } from '../../services/graphql.service';
import { MateriaService } from '../../services/materia.service';
import { InscripcionService } from '../../services/inscripcion.service';
import { AuthService } from '../../services/auth.service';

interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: { nombre: string };
}

// HU-S2.5 · Panel de Administración Académico (exclusivo rol ADMIN)
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  private gql = inject(GraphqlService);
  private materiaService = inject(MateriaService);
  private inscripcionService = inject(InscripcionService);
  private authService = inject(AuthService);

  usuarios = signal<UsuarioAdmin[]>([]);
  totalMaterias = signal(0);
  totalInscripciones = signal(0);
  error = signal<string | null>(null);

  adminNombre = () => this.authService.currentUser()?.nombre ?? 'Administrador';

  ngOnInit() {
    this.gql.request<{ usuarios: UsuarioAdmin[] }>(`query { usuarios { id nombre email rol { nombre } } }`)
      .subscribe({
        next: d => this.usuarios.set(d.usuarios),
        error: err => this.error.set(err.message)
      });
    this.materiaService.listar().subscribe({ next: m => this.totalMaterias.set(m.length) });
    this.inscripcionService.listar().subscribe({ next: i => this.totalInscripciones.set(i.length) });
  }

  contarPorRol(rol: string): number {
    return this.usuarios().filter(u => u.rol?.nombre === rol).length;
  }
}
