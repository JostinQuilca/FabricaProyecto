import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Role } from '../../models/user.model';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss']
})
export class RegistroComponent {
  registroForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  roles = Object.values(Role);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email, this.institutionalEmailValidator]],
      password: ['', [Validators.required, this.strongPasswordValidator]],
      confirmPassword: ['', Validators.required],
      rol: [Role.ESTUDIANTE, Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  institutionalEmailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    if (!email) return null;
    const isInstitutional = email.endsWith('.edu.ec') || email.endsWith('.edu');
    return isInstitutional ? null : { notInstitutional: true };
  }

  strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSpecial = /[!@#\$%\^\&*\)\(+=._-]/.test(password);
    const validLength = password.length >= 8;

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecial && validLength;

    if (!passwordValid) {
      return { 
        strongPassword: {
          hasUpperCase,
          hasLowerCase,
          hasNumeric,
          hasSpecial,
          validLength
        }
      };
    }
    return null;
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') this.showPassword = !this.showPassword;
    else this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { nombre, email, password, rol } = this.registroForm.value;

    this.authService.registro(nombre, email, password, rol).subscribe({
      next: (payload) => {
        this.isLoading = false;
        this.successMessage = 'Registro exitoso. Redirigiendo...';
        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Error al registrar el usuario.';
        
        // TEMPORARY FOR DEMO (Backend throws "No implementado aún")
        if (err.message && err.message.includes('No implementado')) {
           const fakePayload = {
             token: 'fake-jwt-token',
             usuario: { id: '2', nombre, email, rol, createdAt: new Date().toISOString() }
           };
           localStorage.setItem('token', fakePayload.token);
           localStorage.setItem('user', JSON.stringify(fakePayload.usuario));
           this.authService.currentUser.set(fakePayload.usuario);
           
           this.successMessage = 'Registro simulado exitoso (backend stub).';
           setTimeout(() => this.router.navigate(['/dashboard']), 1500);
        }
      }
    });
  }
}
